import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import { auth, identity, admin, hash, type AppEnv } from './auth';
import { ConfigSchema, PlanSchema, deduplicate, secret, type Env, type Activity } from './model';
import { config, records, publish, audit } from './store';
import { capabilities, loadSource, normalizeLuma } from './connectors';
import { syncAll, syncSource } from './sync';
import { JourneySchema, journey } from './journeys';
import { calendar } from './ics';
import { commerce, recoverCommerce } from './commerce';
import { serviceRuns, seconds } from './gtfs';
import { json } from './http';
import { diagnostics } from './diagnostics';
import { providerWebhooks, recoverNotifications } from './provider-webhooks';
import { inventory } from './inventory';
import { googleCalendar } from './google-calendar';
import { transactions, recoverReservations } from './transactions';
const app = new Hono<AppEnv>();
app.use('*', async (c, next) => {
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  await next();
});
app.use('*', bodyLimit({ maxSize: 1000000 }));
app.use('*', async (c, next) => {
  if (
    /^\/api\/v1\/(auth|plans|orders|tickets|admin|offers|reservations|calendar|integrations)(\/|$)/.test(
      c.req.path,
    )
  )
    c.header('Cache-Control', 'private, no-store');
  await next();
});
app.use('*', async (c, next) => {
  const origin = c.req.header('Origin');
  if (
    !['GET', 'HEAD', 'OPTIONS'].includes(c.req.method) &&
    !c.req.path.startsWith('/api/v1/webhooks/') &&
    origin !== c.env.APP_ORIGIN &&
    !(c.req.path === '/api/v1/bootstrap' && c.req.header('Authorization'))
  )
    return c.json({ error: 'Untrusted request origin' }, 403);
  if (Number(c.req.header('Content-Length') || 0) > 1000000)
    return c.json({ error: 'Request too large' }, 413);
  await next();
});
app.use(
  '*',
  cors({
    origin: (origin, c) => (origin === c.env.APP_ORIGIN ? origin : ''),
    credentials: true,
    allowHeaders: ['Content-Type', 'Idempotency-Key', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  }),
);
app.onError((e, c) => {
  if (e instanceof z.ZodError)
    return c.json(
      {
        error: 'Invalid input',
        details: e.issues.map((i) => ({ path: i.path, message: i.message })),
      },
      400,
    );
  console.error(JSON.stringify({ event: 'request_failed', path: c.req.path, type: e.name }));
  return c.json({ error: '処理を完了できません。設定・接続状態を確認してください。' }, 502);
});
app.get('/health', (c) => c.json({ status: 'ok', service: 'openmaas-platform' }));
app.use('/api/v1/*', async (c, next) => {
  if (
    ((c.req.method === 'GET' &&
      (c.req.path === '/api/v1/auth/login' || c.req.path.startsWith('/api/v1/activities/'))) ||
      (c.req.method === 'POST' &&
        [
          '/api/v1/journeys',
          '/api/v1/accommodations/search',
          '/api/v1/services/search',
          '/api/v1/offers',
        ].includes(c.req.path))) &&
    c.env.SEARCH_LIMITER
  ) {
    const r = await c.env.SEARCH_LIMITER.limit({
      key: c.req.header('CF-Connecting-IP') || 'local',
    });
    if (!r.success) return c.json({ error: 'Search rate limit exceeded' }, 429);
  }
  await next();
});
app.route('/api/v1/auth', auth);
app.route('/api/v1', commerce);
app.get('/api/v1/config', async (c) => {
  const cfg = await config(c.env);
  return c.json({
    name: cfg.name,
    region: cfg.region,
    language: cfg.language,
    timezone: cfg.timezone,
    contact: cfg.contact,
    features: cfg.features,
    journeyProvider: cfg.journey.provider,
  });
});
app.get('/api/v1/service-connections', async (c) => {
  const cfg = await config(c.env);
  return c.json(
    cfg.sources
      .filter((s) => s.enabled)
      .filter((s) =>
        ['booking', 'expedia'].includes(s.kind)
          ? cfg.features.accommodations
          : s.kind === 'uber'
            ? cfg.features.transit
            : s.kind === 'google-calendar' || cfg.features.activities,
      )
      .filter((s) =>
        ['square', 'uber', 'viator', 'booking', 'expedia', 'google-calendar'].includes(s.kind),
      )
      .map((s) => ({
        id: s.id,
        label: s.label,
        kind: s.kind,
        operations: s.operations,
        environment: s.params.environment || 'production',
        paymentMode: s.params.paymentMode,
        productCodes:
          s.kind === 'viator'
            ? (s.params.productCodes || '').split(',').filter(Boolean)
            : undefined,
        propertyIds:
          s.kind === 'expedia'
            ? (s.params.propertyIds || '').split(',').filter(Boolean)
            : undefined,
      })),
  );
});
app.get('/api/v1/sources', async (c) => {
  const cfg = await config(c.env);
  const states = await c.env.DB.prepare('SELECT * FROM source_state').all<any>();
  return c.json(
    cfg.sources.map((s) => {
      const st = states.results.find((x) => x.id === s.id);
      return {
        id: s.id,
        label: s.label,
        kind: s.kind,
        attribution: s.attribution,
        termsUrl: s.termsUrl,
        capabilities: capabilities[s.kind],
        status: !s.enabled ? 'disabled' : st?.status || 'unconnected',
        lastSuccess: st?.last_success,
        stale:
          !st?.last_success || Date.now() - Date.parse(st.last_success) > s.intervalSeconds * 2000,
        error: st?.error,
      };
    }),
  );
});
async function activities(env: Env) {
  const cfg = await config(env);
  const allowed = new Set(cfg.sources.filter((s) => s.enabled).map((s) => s.id));
  const cached = await env.DB.prepare('SELECT body FROM search_cache WHERE expires_at>?')
    .bind(Date.now())
    .all<{ body: string }>();
  const base = await records(env, 'activity');
  const cachedItems = cached.results
    .flatMap((r) => JSON.parse(r.body))
    .flatMap((a) => {
      if (cfg.sources.find((s) => s.id === a.sourceId)?.kind !== 'luma') return [a];
      const current = base.find((b) => b.id === a.id);
      if (!current) return [];
      return [
        Date.parse(a.fetchedAt) > Date.parse(current.fetchedAt)
          ? a
          : { ...current, description: a.description },
      ];
    });
  const rows = [...cachedItems, ...base]
    .filter(
      (a) =>
        allowed.has(a.sourceId) &&
        (a.category === 'accommodation' ? cfg.features.accommodations : cfg.features.activities),
    )
    .sort(
      (a, b) =>
        cfg.sources.findIndex((s) => s.id === a.sourceId) -
        cfg.sources.findIndex((s) => s.id === b.sourceId),
    );
  return deduplicate(rows);
}
app.get('/api/v1/activities', async (c) => {
  const cfg = await config(c.env);
  if (!cfg.features.activities) return c.json([]);
  let rows = await activities(c.env);
  const q = (c.req.query('q') || '').toLowerCase(),
    cat = c.req.query('category'),
    region = c.req.query('region'),
    date = c.req.query('date');
  rows = rows.filter(
    (a) =>
      (!q || `${a.title} ${a.description} ${a.place.name}`.toLowerCase().includes(q)) &&
      (!cat || a.category === cat) &&
      (!region || a.region === region) &&
      (!date ||
        !a.start ||
        new Intl.DateTimeFormat('sv-SE', {
          timeZone: cfg.timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date(a.start)) === date),
  );
  return c.json(rows);
});
app.get('/api/v1/activities/:id', async (c) => {
  const a = (await activities(c.env)).find((a) => a.id === c.req.param('id'));
  if (!a) return c.json({ error: 'Activity not found' }, 404);
  const s = (await config(c.env)).sources.find((s) => s.id === a.sourceId);
  if (s?.kind === 'luma') {
    const key = `luma-detail:${a.id}`;
    const cached = await c.env.DB.prepare('SELECT id FROM search_cache WHERE id=? AND expires_at>?')
      .bind(key, Date.now())
      .first();
    if (cached) return c.json(a);
    try {
      const u = new URL('https://public-api.luma.com/v1/events/get');
      u.searchParams.set('event_id', a.externalId);
      const e = await json(u, { headers: { 'x-luma-api-key': secret(c.env, s.secretRef) } });
      if (e.visibility !== 'public') {
        await c.env.DB.prepare("DELETE FROM records WHERE source_id=? AND kind='activity' AND id=?")
          .bind(s.id, a.id)
          .run();
        return c.json({ error: 'Activity is no longer public' }, 404);
      }
      if (e.id !== a.externalId) throw new Error('Provider event identity mismatch');
      const detail = normalizeLuma(s, e);
      await c.env.DB.prepare('INSERT OR REPLACE INTO search_cache VALUES(?,?,?,?)')
        .bind(key, s.id, JSON.stringify([detail]), Date.now() + s.intervalSeconds * 1000)
        .run();
      return c.json(detail);
    } catch {
      return c.json({ ...a, detailStatus: 'unavailable' });
    }
  }
  return c.json(a);
});
app.get('/api/v1/occurrences', async (c) =>
  c.json(
    (await activities(c.env))
      .filter((a) => a.start)
      .map((a) => ({
        id: a.id,
        activityId: a.id,
        start: a.start,
        end: a.end,
        place: a.place,
        status: a.status,
        online: a.online,
      })),
  ),
);
app.get('/api/v1/accommodations', async (c) => {
  const cfg = await config(c.env);
  return c.json(
    cfg.features.accommodations
      ? (await activities(c.env)).filter((a) => a.category === 'accommodation')
      : [],
  );
});
app.post('/api/v1/accommodations/search', async (c) => {
  const cfg = await config(c.env);
  if (!cfg.features.accommodations)
    return c.json({ error: 'Accommodation search is disabled' }, 404);
  const date = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(
      (v) =>
        Number.isFinite(Date.parse(v + 'T00:00:00Z')) &&
        new Date(v + 'T00:00:00Z').toISOString().slice(0, 10) === v,
      'Invalid date',
    );
  const dto = z
    .object({
      sourceId: z.string(),
      checkinDate: date,
      checkoutDate: date,
      adults: z.number().int().min(1).max(6).default(1),
    })
    .strict()
    .parse(await c.req.json());
  if (dto.checkoutDate <= dto.checkinDate)
    return c.json({ error: 'Check-out must be after check-in' }, 400);
  const s = cfg.sources.find((s) => s.id === dto.sourceId && s.kind === 'rakuten' && s.enabled);
  if (!s) return c.json({ error: 'Accommodation source is not enabled' }, 404);
  const key = await hash(JSON.stringify(dto));
  const cached = await c.env.DB.prepare('SELECT body FROM search_cache WHERE id=? AND expires_at>?')
    .bind(key, Date.now())
    .first<{ body: string }>();
  if (cached) return c.json(JSON.parse(cached.body));
  const result = await loadSource(
    {
      ...s,
      params: {
        ...s.params,
        checkinDate: dto.checkinDate,
        checkoutDate: dto.checkoutDate,
        adultNum: String(dto.adults),
      },
    },
    c.env,
  );
  const rows = result.items.map((r) => ({
    ...(r.body as Activity),
    id: `${(r.body as Activity).id}@${key.slice(0, 12)}`,
    bookingWindow: {
      checkinDate: dto.checkinDate,
      checkoutDate: dto.checkoutDate,
      adults: dto.adults,
    },
  }));
  await c.env.DB.prepare('INSERT OR REPLACE INTO search_cache VALUES(?,?,?,?)')
    .bind(key, s.id, JSON.stringify(rows), Date.now() + s.intervalSeconds * 1000)
    .run();
  return c.json(rows);
});
app.get('/api/v1/places', async (c) => {
  const q = z.string().trim().min(2).max(100).parse(c.req.query('q')).toLocaleLowerCase();
  const cfg = await config(c.env);
  const stops = cfg.features.transit
    ? [...(await records(c.env, 'gtfs:stops')), ...(await records(c.env, 'odpt:stops'))]
    : [];
  const places = [
    ...stops.map((s) => ({ name: s.stop_name, lat: Number(s.stop_lat), lon: Number(s.stop_lon) })),
    ...(await activities(c.env)).map((a) => a.place),
  ];
  const seen = new Set<string>();
  return c.json(
    places
      .filter(
        (p) =>
          p.name &&
          p.lat !== undefined &&
          p.lon !== undefined &&
          Number.isFinite(p.lat) &&
          Number.isFinite(p.lon) &&
          `${p.name} ${'address' in p ? p.address || '' : ''}`.toLocaleLowerCase().includes(q),
      )
      .filter((p) => {
        const key = `${p.name}:${p.lat}:${p.lon}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 20),
  );
});
app.get('/api/v1/shared-mobility', async (c) =>
  c.json((await config(c.env)).features.transit ? await records(c.env, 'shared-mobility') : []),
);
app.get('/api/v1/transit', async (c) => {
  const cfg = await config(c.env);
  if (!cfg.features.transit) return c.json({ stops: [], routes: [], realtime: [] });
  return c.json({
    stops: [...(await records(c.env, 'gtfs:stops')), ...(await records(c.env, 'odpt:stops'))],
    stationTimetables: await records(c.env, 'odpt:StationTimetable'),
    calendars: [
      ...new Set((await records(c.env, 'odpt:StationTimetable')).map((t) => t['odpt:calendar'])),
    ],
    trainTimetables: await records(c.env, 'odpt:TrainTimetable'),
    routes: await records(c.env, 'gtfs:routes'),
    realtime: await records(c.env, 'realtime'),
  });
});
app.get('/api/v1/transit/departures', async (c) => {
  const stop = z.string().min(1).parse(c.req.query('stopId')),
    date = z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .parse(c.req.query('date'));
  const station = (await records(c.env, 'odpt:stops')).find(
    (s) => `${s.sourceId}:${s.stop_id}` === stop,
  );
  if (station) {
    const stationNames = await records(c.env, 'odpt:stops');
    const railways = await records(c.env, 'odpt:Railway');
    const calendar = c.req.query('calendar');
    if (!calendar)
      return c.json(
        { error: 'ODPT requires a calendar pattern; holidays are not inferred from the date' },
        422,
      );
    const tables = (await records(c.env, 'odpt:StationTimetable')).filter(
      (t) =>
        t.sourceId === station.sourceId &&
        t['odpt:station'] === station.stop_id &&
        t['odpt:calendar'] === calendar,
    );
    return c.json(
      tables
        .flatMap((t) =>
          (t['odpt:stationTimetableObject'] || []).map((d: any) => ({
            sourceId: t.sourceId,
            stop_id: station.stop_id,
            departure_time: d['odpt:departureTime'],
            trip_id: d['odpt:train'] || d['odpt:trainNumber'],
            routeName:
              railways.find(
                (r) => r.sourceId === t.sourceId && r['owl:sameAs'] === t['odpt:railway'],
              )?.['dc:title'] || '鉄道',
            destinationName:
              (Array.isArray(d['odpt:destinationStation'])
                ? d['odpt:destinationStation']
                : [d['odpt:destinationStation']]
              )
                .filter(Boolean)
                .map(
                  (id: string) =>
                    stationNames.find((s) => s.sourceId === t.sourceId && s.stop_id === id)
                      ?.stop_name,
                )
                .filter(Boolean)
                .join('・') || undefined,
            direction: t['odpt:railDirection'],
            destination: d['odpt:destinationStation'],
            calendar,
            date,
            time_reference: 'calendar-pattern',
          })),
        )
        .sort((a, b) => seconds(a.departure_time) - seconds(b.departure_time)),
    );
  }
  const trips = await records(c.env, 'gtfs:trips'),
    cal = await records(c.env, 'gtfs:calendar'),
    ex = await records(c.env, 'gtfs:calendar_dates');
  const rows = (await records(c.env, 'gtfs:stop_times'))
    .filter((s) => `${s.sourceId}:${s.stop_id}` === stop)
    .filter((s) => {
      const t = trips.find((t) => t.sourceId === s.sourceId && t.trip_id === s.trip_id);
      return (
        t &&
        serviceRuns(
          t.service_id,
          date,
          cal.filter((x) => x.sourceId === s.sourceId),
          ex.filter((x) => x.sourceId === s.sourceId),
        )
      );
    })
    .sort((a, b) => seconds(a.departure_time) - seconds(b.departure_time));
  const routes = await records(c.env, 'gtfs:routes');
  return c.json(
    rows.map((r) => {
      const trip = trips.find((t) => t.sourceId === r.sourceId && t.trip_id === r.trip_id);
      const route = routes.find((t) => t.sourceId === r.sourceId && t.route_id === trip?.route_id);
      return {
        ...r,
        routeName: route?.route_short_name || route?.route_long_name,
        destinationName: trip?.trip_headsign,
      };
    }),
  );
});
app.post('/api/v1/journeys', async (c) => {
  const dto = JourneySchema.parse(await c.req.json());
  const a = (await activities(c.env)).find((a) => a.id === dto.activityId);
  if (!a) return c.json({ error: 'Activity not found' }, 404);
  if (a.status === 'cancelled') return c.json({ error: 'Activity has been cancelled' }, 409);
  try {
    return c.json(await journey(await config(c.env), c.env, a, dto));
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : 'Journey unavailable' }, 422);
  }
});
app.use('/api/v1/plans', identity);
app.use('/api/v1/plans/*', identity);
async function currentPlan(env: Env, row: any) {
  const body = JSON.parse(row.body);
  const current = await activities(env);
  return {
    ...row,
    body: undefined,
    ...body,
    items: body.items.map((i: any) => {
      const a = current.find((a) => a.id === i.referenceId);
      return {
        ...i,
        current: a,
        changed:
          !!a &&
          !!i.snapshot &&
          (a.start !== i.snapshot.start ||
            a.end !== i.snapshot.end ||
            a.status !== i.snapshot.status ||
            a.online !== i.snapshot.online ||
            JSON.stringify(a.place) !== JSON.stringify(i.snapshot.place)),
        unavailable: !!i.referenceId && ['activity', 'accommodation'].includes(i.type) && !a,
      };
    }),
  };
}
app.get('/api/v1/plans', async (c) => {
  const rows = await c.env.DB.prepare('SELECT * FROM plans WHERE owner=? ORDER BY updated_at DESC')
    .bind(c.get('owner'))
    .all();
  return c.json(await Promise.all(rows.results.map((r) => currentPlan(c.env, r))));
});
app.post('/api/v1/plans', async (c) => {
  const body = PlanSchema.parse(await c.req.json());
  const current = await activities(c.env);
  for (const i of body.items) {
    if (i.referenceId && ['activity', 'accommodation'].includes(i.type)) {
      const a = current.find((a) => a.id === i.referenceId);
      if (!a) return c.json({ error: 'Referenced activity not found' }, 400);
      i.snapshot = a;
    }
  }
  const id = crypto.randomUUID(),
    now = new Date().toISOString();
  await c.env.DB.prepare('INSERT INTO plans VALUES(?,?,?,?,?)')
    .bind(id, c.get('owner'), JSON.stringify(body), now, now)
    .run();
  return c.json({ id, ...body }, 201);
});
app.put('/api/v1/plans/:id', async (c) => {
  const body = PlanSchema.parse(await c.req.json());
  const current = await activities(c.env);
  for (const i of body.items) {
    if (i.referenceId && ['activity', 'accommodation'].includes(i.type)) {
      const a = current.find((a) => a.id === i.referenceId);
      if (a) i.snapshot = a;
    }
  }
  const r = await c.env.DB.prepare('UPDATE plans SET body=?,updated_at=? WHERE id=? AND owner=?')
    .bind(JSON.stringify(body), new Date().toISOString(), c.req.param('id'), c.get('owner'))
    .run();
  return r.meta.changes ? c.json({ ok: true }) : c.json({ error: 'Plan not found' }, 404);
});
app.delete('/api/v1/plans/:id', async (c) => {
  const r = await c.env.DB.prepare('DELETE FROM plans WHERE id=? AND owner=?')
    .bind(c.req.param('id'), c.get('owner'))
    .run();
  return r.meta.changes ? c.json({ ok: true }) : c.json({ error: 'Plan not found' }, 404);
});
app.get('/api/v1/plans/:id/calendar.ics', async (c) => {
  const row = await c.env.DB.prepare('SELECT * FROM plans WHERE id=? AND owner=?')
    .bind(c.req.param('id'), c.get('owner'))
    .first<any>();
  if (!row) return c.json({ error: 'Plan not found' }, 404);
  const p = await currentPlan(c.env, row);
  return new Response(
    calendar(
      row.id,
      p.title,
      p.items.map((i: any) => ({
        ...i,
        start: i.current ? i.current.start : i.start,
        end: i.current ? i.current.end : i.end,
        place: i.current?.place || i.snapshot?.place,
        bookingWindow: i.current?.bookingWindow || i.snapshot?.bookingWindow,
        status: i.current?.status,
      })),
    ),
    {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="openmaas.ics"',
        'Cache-Control': 'private, no-store',
      },
    },
  );
});
// Bootstrap exists only before the first saved configuration and requires a deployment secret.
app.post('/api/v1/bootstrap', async (c) => {
  if (!c.env.BOOTSTRAP_TOKEN || c.req.header('Authorization') !== `Bearer ${c.env.BOOTSTRAP_TOKEN}`)
    return c.json({ error: 'Bootstrap token required' }, 403);
  const cfg = ConfigSchema.parse(await c.req.json());
  const result = await c.env.DB.prepare('INSERT OR IGNORE INTO settings VALUES(1,?,1,?)')
    .bind(JSON.stringify(cfg), new Date().toISOString())
    .run();
  return result.meta.changes
    ? c.json({ ok: true }, 201)
    : c.json({ error: 'Already configured' }, 409);
});
app.use('/api/v1/admin/*', identity, admin);
app.route('/api/v1/admin', diagnostics);
app.get('/api/v1/admin/config', async (c) => c.json(await config(c.env)));
app.put('/api/v1/admin/config', async (c) => {
  const cfg = ConfigSchema.parse(await c.req.json());
  if (!cfg.admins.includes(c.get('owner')))
    return c.json({ error: 'Keep the current administrator in the configuration' }, 400);
  const previous = await config(c.env);
  const active = (
    await c.env.DB.prepare(
      "SELECT DISTINCT source_id FROM provider_reservations WHERE status IN ('unknown','pending','confirmed','cancel_pending')",
    ).all<{ source_id: string }>()
  ).results;
  for (const { source_id } of active) {
    const before = previous.sources.find((s) => s.id === source_id),
      after = cfg.sources.find((s) => s.id === source_id);
    if (
      before &&
      (!after ||
        before.kind !== after.kind ||
        before.secretRef !== after.secretRef ||
        [
          'environment',
          'locationId',
          'organizationId',
          'affiliateId',
          'clientId',
          'clientSecretRef',
        ].some((k) => before.params[k] !== after.params[k]))
    )
      return c.json(
        {
          error: 'Reconcile active reservations before removing or retargeting this connection',
          sourceId: source_id,
        },
        409,
      );
  }
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE settings SET body=?,revision=revision+1,updated_at=? WHERE id=1').bind(
      JSON.stringify(cfg),
      new Date().toISOString(),
    ),
    ...previous.sources
      .filter(
        (before) =>
          JSON.stringify(before) !== JSON.stringify(cfg.sources.find((s) => s.id === before.id)),
      )
      .map((s) => c.env.DB.prepare('DELETE FROM connection_checks WHERE source_id=?').bind(s.id)),
  ]);
  await audit(c.env, c.get('owner'), 'config_updated', 'settings');
  return c.json({ ok: true });
});
app.post('/api/v1/admin/sources/:id/sync', async (c) => {
  const s = (await config(c.env)).sources.find((s) => s.id === c.req.param('id') && s.enabled);
  if (!s) return c.json({ error: 'Source not found' }, 404);
  const status = await syncSource(c.env, s);
  return c.json({ status });
});
app.post('/api/v1/admin/sources/:id/import', async (c) => {
  const cfg = await config(c.env);
  const s = cfg.sources.find((s) => s.id === c.req.param('id') && s.kind === 'gtfs');
  if (!s) return c.json({ error: 'GTFS source not found' }, 404);
  const items = z
    .array(
      z.object({
        kind: z.string().startsWith('gtfs:'),
        id: z.string(),
        body: z.record(z.unknown()),
      }),
    )
    .parse(await c.req.json());
  await publish(c.env, s.id, items, s.intervalSeconds);
  return c.json({ ok: true });
});
app.get('/api/v1/admin/transactions', async (c) =>
  c.json({
    orders: (
      await c.env.DB.prepare(
        'SELECT id,owner,product_id,amount,status,updated_at FROM orders ORDER BY created_at DESC LIMIT 200',
      ).all()
    ).results,
    jobs: (await c.env.DB.prepare('SELECT * FROM jobs ORDER BY next_attempt LIMIT 200').all())
      .results,
    reservations: (
      await c.env.DB.prepare(
        'SELECT id,source_id,status,created_at,updated_at FROM provider_reservations ORDER BY updated_at DESC LIMIT 200',
      ).all()
    ).results,
    reservationJobs: (
      await c.env.DB.prepare(
        'SELECT id,reservation_id,kind,status,attempts,next_attempt FROM provider_operations ORDER BY next_attempt LIMIT 200',
      ).all()
    ).results,
    audit: (await c.env.DB.prepare('SELECT * FROM audit ORDER BY id DESC LIMIT 100').all()).results,
  }),
);
app.post('/api/v1/admin/reconcile', async (c) => {
  await recoverCommerce(c.env);
  await recoverReservations(c.env);
  await recoverNotifications(c.env);
  return c.json({ ok: true });
});
app.get('/api/v1/admin/orders.csv', async (c) => {
  const rows = await c.env.DB.prepare(
    'SELECT id,product_id,amount,currency,status,created_at FROM orders ORDER BY created_at DESC',
  ).all<any>();
  const cell = (v: unknown) => {
    const text = String(v);
    return `"${(/^[=+@\-\t\r]/.test(text) ? "\'" + text : text).replaceAll('"', '""')}"`;
  };
  return new Response(
    [
      'id,product_id,amount,currency,status,created_at',
      ...rows.results.map((r) => Object.values(r).map(cell).join(',')),
    ].join('\r\n'),
    {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="orders.csv"',
      },
    },
  );
});
app.route('/api/v1', transactions);
app.route('/api/v1', providerWebhooks);
app.route('/api/v1', inventory);
app.route('/api/v1', googleCalendar);
export { app };
export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(
      (async () => {
        await env.DB.batch([
          env.DB.prepare('DELETE FROM oidc_pending WHERE expires_at<?').bind(Date.now()),
          env.DB.prepare('DELETE FROM sessions WHERE expires_at<?').bind(Date.now()),
          env.DB.prepare('DELETE FROM oauth_states WHERE expires_at<?').bind(Date.now()),
        ]);
        await syncAll(env);
        await recoverCommerce(env);
        await recoverReservations(env);
        await recoverNotifications(env);
        await env.DB.prepare('DELETE FROM oauth_states WHERE expires_at<?').bind(Date.now()).run();
        await env.DB.prepare('DELETE FROM oidc_pending WHERE expires_at<?').bind(Date.now()).run();
        await env.DB.prepare('DELETE FROM search_cache WHERE expires_at<?').bind(Date.now()).run();
        await env.DB.prepare('DELETE FROM sessions WHERE expires_at<?').bind(Date.now()).run();
      })(),
    );
  },
};
