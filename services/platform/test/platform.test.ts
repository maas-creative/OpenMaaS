import { beforeAll, afterAll, afterEach, describe, it, expect, vi } from 'vitest';
import { Miniflare } from 'miniflare';
import { readFileSync } from 'node:fs';
import { zipSync, strToU8 } from 'fflate';
import gtfsRealtime from 'gtfs-realtime-bindings';
import { app } from '../src/index';
import { ConfigSchema, SourceSchema, activity, deduplicate, type Env } from '../src/model';
import { publish, records } from '../src/store';
import { loadSource, normalizeLuma } from '../src/connectors';
import { timing, journey } from '../src/journeys';
import { parseGtfs, parseRealtime, seconds, serviceRuns } from '../src/gtfs';
import { hash } from '../src/auth';
import { fulfill, recoverCommerce, verifyStripe } from '../src/commerce';
import { checkOffer, assertCapability } from '../src/contracts';
import { calendar } from '../src/ics';
let mf: Miniflare, env: Env;
const source = SourceSchema.parse({
  id: 'events',
  kind: 'manual',
  label: 'Events',
  attribution: 'Test',
  termsUrl: 'https://example.org/terms',
});
const event = activity(
  source,
  'one',
  'Activity',
  { name: 'Venue', lat: 35, lon: 139 },
  {
    start: '2026-10-10T10:00:00+09:00',
    end: '2026-10-10T12:00:00+09:00',
    actions: [{ type: 'external', label: 'Signup', url: 'https://example.org/event' }],
  },
);
const cfg = ConfigSchema.parse({
  version: 1,
  name: 'Test',
  region: 'Japan',
  contact: 'Test',
  features: { activities: true, transit: true, accommodations: true, commerce: true },
  sources: [source],
  admins: ['https://id.example.org|admin'],
  products: [
    {
      id: 'one',
      title: 'Reference ticket',
      amount: 500,
      currency: 'JPY',
      validHours: 24,
      enabled: true,
      terms: 'Unused valid tickets only',
      seller: 'Test',
      contact: 'Test',
    },
  ],
});
const req = (
  path: string,
  method = 'GET',
  body?: unknown,
  token = 'user',
  extra: Record<string, string> = {},
) =>
  app.request(
    'http://localhost' + path,
    {
      method,
      headers: {
        Origin: 'http://localhost:3000',
        Cookie: `openmaas_session=${token}`,
        'Content-Type': 'application/json',
        ...extra,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    },
    env,
  );
beforeAll(async () => {
  mf = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("ok")}}',
    compatibilityDate: '2026-08-01',
    d1Databases: { DB: 'test' },
    r2Buckets: ['FEEDS'],
  });
  env = {
    DB: await mf.getD1Database('DB'),
    FEEDS: await mf.getR2Bucket('FEEDS'),
    APP_ORIGIN: 'http://localhost:3000',
    API_ORIGIN: 'http://localhost:8787',
    TICKET_SECRET: 'ticket-test-secret',
    STRIPE_SECRET_KEY: 'sk_test_fixture',
    STRIPE_WEBHOOK_SECRET: 'fixture',
  } as unknown as Env;
  for (const statement of (
    readFileSync(new URL('../migrations/0001_platform.sql', import.meta.url), 'utf8') +
    readFileSync(new URL('../migrations/0002_search_cache.sql', import.meta.url), 'utf8') +
    readFileSync(new URL('../migrations/0003_connections.sql', import.meta.url), 'utf8')
  )
    .split(';')
    .filter((s) => s.trim()))
    await env.DB.prepare(statement).run();
  await env.DB.prepare('INSERT INTO settings VALUES(1,?,1,?)')
    .bind(JSON.stringify(cfg), new Date().toISOString())
    .run();
  for (const token of ['user', 'admin', 'other'])
    await env.DB.prepare('INSERT INTO sessions VALUES(?,?,?,?)')
      .bind(await hash(token), `https://id.example.org|${token}`, token, Date.now() + 3600000)
      .run();
  await publish(env, source.id, [{ kind: 'activity', id: event.id, body: event }], 300);
});
afterAll(async () => await mf?.dispose());
afterEach(() => vi.unstubAllGlobals());
const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
describe('Activities and plans on actual D1', () => {
  it('public browsing hides credentials and rejects anonymous saving', async () => {
    expect((await req('/api/v1/activities')).status).toBe(200);
    const config = await (await req('/api/v1/config')).json();
    expect(config).not.toHaveProperty('admins');
    expect((await req('/api/v1/plans', 'POST', { title: 'x', items: [] }, 'none')).status).toBe(
      401,
    );
  });
  it('rejects foreign origins even with an Authorization header', async () => {
    const r = await app.request(
      'http://localhost/api/v1/plans',
      {
        method: 'POST',
        headers: {
          Origin: 'https://evil.example.org',
          Authorization: 'ignored',
          Cookie: 'openmaas_session=user',
        },
        body: '{}',
      },
      env,
    );
    expect(r.status).toBe(403);
  });
  it('stores unreserved plans, propagates time/cancellation, isolates owners and exports ICS', async () => {
    const r = await req('/api/v1/plans', 'POST', {
      title: 'Trip',
      items: [
        {
          type: 'activity',
          referenceId: event.id,
          title: event.title,
          status: 'external',
          start: event.start,
        },
      ],
    });
    expect(r.status).toBe(201);
    const plan = await r.json();
    expect(
      (await req(`/api/v1/plans/${plan.id}/calendar.ics`, 'GET', undefined, 'other')).status,
    ).toBe(404);
    await publish(
      env,
      source.id,
      [
        {
          kind: 'activity',
          id: event.id,
          body: { ...event, start: '2026-10-10T11:00:00+09:00', status: 'cancelled' },
        },
      ],
      300,
    );
    const plans = await (await req('/api/v1/plans')).json();
    expect(plans[0].items[0]).toMatchObject({
      status: 'external',
      changed: true,
      current: { status: 'cancelled' },
    });
    const ics = await (await req(`/api/v1/plans/${plan.id}/calendar.ics`)).text();
    expect(ics).toContain('STATUS:CANCELLED');
    expect(ics).toContain('DTSTART:20261010T020000Z');
    expect(
      (
        await req('/api/v1/journeys', 'POST', {
          activityId: event.id,
          direction: 'outbound',
          origin: { lat: 35, lon: 139 },
        })
      ).status,
    ).toBe(409);
    await publish(env, source.id, [{ kind: 'activity', id: event.id, body: event }], 300);
  });
  it('preserves data until new imports are published', async () => {
    await env.DB.prepare(
      "INSERT INTO records VALUES('events','activity','partial','{}','unpublished')",
    ).run();
    expect((await records(env, 'activity')).length).toBe(1);
  });
  it('administrator endpoints require administrator identity', async () => {
    expect((await req('/api/v1/admin/config')).status).toBe(403);
    expect((await req('/api/v1/admin/config', 'GET', undefined, 'admin')).status).toBe(200);
  });
  it('all four templates validate without enabling nonexistent booking capabilities', () => {
    for (const name of ['event-transit', 'tourism', 'local-transit', 'ticket-sales']) {
      const c = ConfigSchema.parse(
        JSON.parse(
          readFileSync(new URL(`../../../examples/platform/${name}.json`, import.meta.url), 'utf8'),
        ),
      );
      expect(c.version).toBe(2);
    }
  });
});
describe('Connector contracts', () => {
  it('Luma uses flat current API, calendar key, pagination and public visibility only', async () => {
    const s = SourceSchema.parse({ ...source, id: 'luma', kind: 'luma', secretRef: 'LUMA_KEY' });
    const fetcher = vi.fn(async (url: any, init: any) => {
      expect(init.headers['x-luma-api-key']).toBe('test');
      expect(String(url)).toContain('/v1/calendars/events/list');
      return jsonResponse({
        entries: [
          {
            id: 'a',
            name: 'Public',
            visibility: 'public',
            location_visibility: 'public',
            location_type: 'offline',
            coordinate: { latitude: 35, longitude: 139 },
            start_at: event.start,
            url: 'https://luma.com/test',
          },
          { id: 'b', visibility: 'private', name: 'Private' },
        ],
        has_more: false,
      });
    });
    const r = await loadSource(s, { ...env, LUMA_KEY: 'test' }, fetcher as typeof fetch);
    expect(r.items).toHaveLength(1);
    expect(r.items[0].body).toMatchObject({ place: { lat: 35 }, online: false });
  });
  it('private Luma venue coordinates and meeting links are not published', () => {
    const a = normalizeLuma(source, {
      id: 'x',
      name: 'x',
      coordinate: { latitude: 35, longitude: 139 },
      location_visibility: 'private',
      geo_address_json: { city: 'Tokyo', address: 'Secret' },
      location_type: 'zoom',
      meeting_url: 'https://secret.example.org',
    });
    expect(a.place.lat).toBeUndefined();
    expect(a.place.name).toBe('Tokyo');
    expect(a).not.toHaveProperty('meeting_url');
  });
  it('connpass API key and missing venue mapping', async () => {
    const s = SourceSchema.parse({ ...source, kind: 'connpass', secretRef: 'CONNPASS_KEY' });
    const r = await loadSource(s, { ...env, CONNPASS_KEY: 'key' }, (async (_u, init: any) => {
      expect(init.headers['X-API-Key']).toBe('key');
      return jsonResponse({
        events: [
          {
            event_id: 1,
            title: 'Online',
            place: 'オンライン',
            lat: null,
            lon: null,
            event_url: 'https://connpass.com/event/1',
            started_at: event.start,
          },
        ],
        results_available: 1,
      });
    }) as typeof fetch);
    expect(r.items[0].body).toMatchObject({ online: true });
  });
  it('楽天 accessKey stays in header and search cannot create a reservation', async () => {
    const s = SourceSchema.parse({
      ...source,
      kind: 'rakuten',
      secretRef: 'RAKUTEN_KEY',
      params: { applicationId: 'app', hotelNo: '1' },
    });
    const r = await loadSource(s, { ...env, RAKUTEN_KEY: 'key' }, (async (u, init: any) => {
      expect(String(u)).toContain('SimpleHotelSearch/20260731');
      expect(String(u)).not.toContain('accessKey');
      expect(init.headers.accessKey).toBe('key');
      return jsonResponse({
        hotels: [
          {
            hotel: [
              {
                hotelBasicInfo: {
                  hotelNo: 1,
                  hotelName: 'Hotel',
                  latitude: 35,
                  longitude: 139,
                  hotelInformationUrl: 'https://example.org/hotel',
                },
              },
            ],
          },
        ],
      });
    }) as typeof fetch);
    expect(r.items[0].body).toMatchObject({
      category: 'accommodation',
      actions: [{ type: 'external' }],
    });
  });
  it('GBFS 3.0 station availability retains freshness and ttl', async () => {
    const s = SourceSchema.parse({ ...source, kind: 'gbfs', url: 'https://example.org/gbfs.json' });
    const r = await loadSource(s, env, (async (u) =>
      jsonResponse(
        String(u).endsWith('gbfs.json')
          ? {
              version: '3.0',
              ttl: 60,
              data: { feeds: [{ name: 'station_status', url: 'https://example.org/status.json' }] },
            }
          : {
              version: '3.0',
              ttl: 60,
              last_updated: 100,
              data: { stations: [{ station_id: 's', num_vehicles_available: 2 }] },
            },
      )) as typeof fetch);
    expect(r.items[0].body).toMatchObject({ updated: 100, num_vehicles_available: 2 });
  });
  it('429 exposes retry interval and authentication failures are explicit', async () => {
    const s = SourceSchema.parse({ ...source, kind: 'luma', secretRef: 'KEY' });
    await expect(
      loadSource(
        s,
        { ...env, KEY: 'test' },
        (async () =>
          new Response('', { status: 429, headers: { 'Retry-After': '120' } })) as typeof fetch,
      ),
    ).rejects.toMatchObject({ status: 429, retryAfter: 120 });
    await expect(loadSource(s, env)).rejects.toThrow('credential');
  });
  it('deduplication uses official URL and time, never similar names', () => {
    expect(deduplicate([event, { ...event, id: 'two', title: 'Different' }])).toHaveLength(1);
    expect(deduplicate([event, { ...event, id: 'two', actions: [] }])).toHaveLength(2);
  });
  it('rejects unavailable transactional capability and expired offers', () => {
    expect(() => assertCapability({ capabilities: ['search'] }, 'reserve')).toThrow('Unsupported');
    expect(() =>
      checkOffer({
        id: 'x',
        providerId: 'x',
        expiresAt: '2020-01-01',
        amount: 100,
        currency: 'JPY',
        terms: 'x',
        paymentHandledBy: 'provider',
      }),
    ).toThrow();
  });
});
describe('GTFS and journey timing', () => {
  const files = {
    'agency.txt': 'agency_name,agency_url,agency_timezone\nTest,https://example.org,Asia/Tokyo',
    'stops.txt': 'stop_id,stop_name,stop_lat,stop_lon\ns,Stop,35,139',
    'routes.txt': 'route_id,route_type\nr,3',
    'trips.txt': 'route_id,service_id,trip_id\nr,svc,t',
    'stop_times.txt':
      'trip_id,arrival_time,departure_time,stop_id,stop_sequence\nt,25:00:00,25:00:00,s,1',
    'calendar_dates.txt': 'service_id,date,exception_type\nsvc,20261010,1',
    'transfers.txt': 'from_stop_id,to_stop_id,transfer_type\ns,s,0\ns,s,2',
  };
  it('parses full timetable with calendar exceptions and after-midnight time', () => {
    const r = parseGtfs(
      zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)]))),
      'gtfs',
    );
    expect(r.filter((x) => x.kind === 'gtfs:transfers').map((x) => x.id)).toEqual(['0', '1']);
    expect(seconds('25:00:00')).toBe(90000);
    expect(
      serviceRuns(
        'svc',
        '2026-10-10',
        [],
        [{ service_id: 'svc', date: '20261010', exception_type: '1' }],
      ),
    ).toBe(true);
  });
  it('rejects broken static references', () => {
    const broken = {
      ...files,
      'stop_times.txt': files['stop_times.txt'].replace(',s,', ',unknown,'),
    };
    expect(() =>
      parseGtfs(
        zipSync(Object.fromEntries(Object.entries(broken).map(([k, v]) => [k, strToU8(v)]))),
        'g',
      ),
    ).toThrow('Unknown stop');
  });
  it('decodes actual protobuf, keeps static source identity and timestamp', () => {
    const bytes = gtfsRealtime.transit_realtime.FeedMessage.encode({
      header: { gtfsRealtimeVersion: '2.0', timestamp: 100 },
      entity: [
        {
          id: 'one',
          tripUpdate: {
            trip: { tripId: 't' },
            stopTimeUpdate: [{ stopId: 's', departure: { delay: 60 } }],
          },
        },
      ],
    }).finish();
    const s = SourceSchema.parse({
      ...source,
      kind: 'gtfs-rt',
      url: 'https://example.org/feed',
      staticSourceId: 'static',
    });
    expect(parseRealtime(bytes, s)[0].body).toMatchObject({
      staticSourceId: 'static',
      timestamp: '100',
      tripUpdate: { trip: { tripId: 't' } },
    });
  });
  it('arrival margin defaults 15 minutes, return requires known time, online and missing coordinates reject', () => {
    expect(timing(event, 'outbound').dateTime).toBe('2026-10-10T00:45:00.000Z');
    expect(timing(event, 'return').arriveBy).toBe(false);
    expect(() => timing({ ...event, end: undefined }, 'return')).toThrow('Specify');
    expect(() => timing({ ...event, online: true }, 'outbound')).toThrow('Online');
    expect(() => timing({ ...event, place: { name: 'Unknown' } }, 'outbound')).toThrow(
      'coordinates',
    );
  });
  it('OTP GraphQL sends latestArrival or earliestDeparture and reverses endpoints', async () => {
    const c = ConfigSchema.parse({
      ...cfg,
      journey: { provider: 'otp', url: 'https://otp.example.org/otp/gtfs/v1' },
    });
    for (const direction of ['outbound', 'return'] as const) {
      await journey(
        c,
        env,
        event,
        { direction, origin: { lat: 36, lon: 140 }, bufferMinutes: 15 },
        (async (_u, init: any) => {
          const b = JSON.parse(init.body);
          expect(b.query).toContain('planConnection');
          expect(b.variables.dateTime).toHaveProperty(
            direction === 'outbound' ? 'latestArrival' : 'earliestDeparture',
          );
          expect(b.variables.origin.location.coordinate.latitude).toBe(
            direction === 'outbound' ? 36 : 35,
          );
          return jsonResponse({ data: { planConnection: { edges: [] } } });
        }) as typeof fetch,
      );
    }
  });
  it('ICS escapes injection and folds UTF8 lines', () => {
    const ics = calendar('p', 'title', [
      { title: '日'.repeat(100) + '\nBEGIN:VEVENT', start: event.start },
    ]);
    expect(ics.split('\r\n').every((line) => new TextEncoder().encode(line).length <= 75)).toBe(
      true,
    );
    expect(ics).toContain('\\nBEGIN:VEVENT');
  });
});
describe('Stripe reference transactions with fixture provider', () => {
  const session = (id: string, orderId: string) => ({
    id,
    url: 'https://checkout.stripe.com/test',
    metadata: { orderId },
    amount_total: 500,
    currency: 'jpy',
    payment_status: 'paid',
    payment_intent: 'pi_' + id,
  });
  it('idempotent checkout, authoritative amount, fulfillment and atomic one-time validation', async () => {
    let orderId = '';
    const mock = vi.fn(async (_u: any, init: any) => {
      const b = new URLSearchParams(init.body);
      expect(b.get('line_items[0][price_data][unit_amount]')).toBe('500');
      orderId = b.get('metadata[orderId]')!;
      return jsonResponse(session('cs_one', orderId));
    });
    vi.stubGlobal('fetch', mock);
    const a = await (
      await req('/api/v1/orders', 'POST', { productId: 'one' }, 'user', {
        'Idempotency-Key': 'test-one-key',
      })
    ).json();
    const b = await (
      await req('/api/v1/orders', 'POST', { productId: 'one' }, 'user', {
        'Idempotency-Key': 'test-one-key',
      })
    ).json();
    expect(a.id).toBe(b.id);
    expect(mock).toHaveBeenCalledTimes(1);
    await fulfill(env, session('cs_one', orderId));
    const d = await (await req(`/api/v1/orders/${a.id}`)).json();
    expect(d.status).toBe('paid');
    const r = await Promise.all([
      req('/api/v1/tickets/validate', 'POST', { token: d.ticket.token }, 'admin'),
      req('/api/v1/tickets/validate', 'POST', { token: d.ticket.token }, 'admin'),
    ]);
    expect(r.map((x) => x.status).sort()).toEqual([200, 409]);
    await fulfill(env, session('cs_one', orderId));
    expect(
      (await env.DB.prepare('SELECT status FROM orders WHERE id=?').bind(a.id).first<any>())
        ?.status,
    ).toBe('used');
    expect((await req(`/api/v1/orders/${a.id}/refunds`, 'POST', {})).status).toBe(409);
  });
  it('unknown checkout response recovers with the same provider idempotency key', async () => {
    const keys: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_u, init: any) => {
        keys.push(init.headers['Idempotency-Key']);
        if (keys.length === 1) throw new Error('Network lost after provider accepted');
        const body = new URLSearchParams(init.body);
        return jsonResponse(session('cs_unknown', body.get('metadata[orderId]')!));
      }),
    );
    expect(
      (
        await req('/api/v1/orders', 'POST', { productId: 'one' }, 'user', {
          'Idempotency-Key': 'unknown-response',
        })
      ).status,
    ).toBe(502);
    expect(
      (
        await req('/api/v1/orders', 'POST', { productId: 'one' }, 'user', {
          'Idempotency-Key': 'unknown-response',
        })
      ).status,
    ).toBe(201);
    expect(keys[0]).toBe(keys[1]);
  });
  it('refund failure stops use, durable retry finishes, duplicate refund creates one job', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_u, init: any) => {
        const b = new URLSearchParams(init.body);
        return jsonResponse(session('cs_refund', b.get('metadata[orderId]')!));
      }),
    );
    const a = await (
      await req('/api/v1/orders', 'POST', { productId: 'one' }, 'user', {
        'Idempotency-Key': 'refund-test-key',
      })
    ).json();
    await fulfill(env, session('cs_refund', a.id));
    const d = await (await req(`/api/v1/orders/${a.id}`)).json();
    expect((await req(`/api/v1/orders/${a.id}/refunds`, 'POST', {})).status).toBe(202);
    expect((await req(`/api/v1/orders/${a.id}/refunds`, 'POST', {})).status).toBe(200);
    expect(
      (await req('/api/v1/tickets/validate', 'POST', { token: d.ticket.token }, 'admin')).status,
    ).toBe(409);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 503 })),
    );
    await recoverCommerce(env);
    const job = await env.DB.prepare('SELECT * FROM jobs WHERE order_id=?').bind(a.id).first<any>();
    expect(job.attempts).toBe(1);
    await env.DB.prepare('UPDATE jobs SET next_attempt=? WHERE id=?')
      .bind('2000-01-01', job.id)
      .run();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (u) =>
        String(u).includes('/refunds')
          ? jsonResponse({ status: 'succeeded' })
          : jsonResponse(session('cs_unknown', '')),
      ),
    );
    await recoverCommerce(env);
    expect(
      (await env.DB.prepare('SELECT status FROM orders WHERE id=?').bind(a.id).first<any>())
        ?.status,
    ).toBe('refunded');
  });
  it('signed webhooks require a fresh timestamp and correct signature', async () => {
    await expect(verifyStripe('{}', 't=0,v1=abcd', 'secret')).rejects.toThrow('timestamp');
    await expect(
      verifyStripe('{}', `t=${Math.floor(Date.now() / 1000)},v1=abcd`, 'secret'),
    ).rejects.toThrow('signature');
  });
});

describe('OIDC protocol with signed fixture tokens', () => {
  it('validates state, PKCE, nonce, JWT signature, issuer and audience before issuing a session', async () => {
    const { generateKeyPair, exportJWK, SignJWT } = await import('jose');
    const { privateKey, publicKey } = await generateKeyPair('RS256');
    const jwk = { ...(await exportJWK(publicKey)), kid: 'fixture', alg: 'RS256', use: 'sig' };
    const oidc = { issuer: 'https://oidc.example.org', clientId: 'openmaas' };
    await env.DB.prepare('UPDATE settings SET body=?')
      .bind(JSON.stringify({ ...cfg, oidc }))
      .run();
    let nonce = '';
    let verifier = '';
    vi.stubGlobal(
      'fetch',
      vi.fn(async (u: any, init: any) => {
        if (String(u).endsWith('openid-configuration'))
          return jsonResponse({
            issuer: oidc.issuer,
            authorization_endpoint: oidc.issuer + '/authorize',
            token_endpoint: oidc.issuer + '/token',
            jwks_uri: oidc.issuer + '/jwks',
          });
        if (String(u).endsWith('/jwks')) return jsonResponse({ keys: [jwk] });
        const b = new URLSearchParams(init.body);
        expect(b.get('code_verifier')).toBe(verifier);
        expect(b.get('redirect_uri')).toBe(env.API_ORIGIN + '/api/v1/auth/callback');
        return jsonResponse({
          id_token: await new SignJWT({ nonce, name: 'OIDC fixture' })
            .setProtectedHeader({ alg: 'RS256', kid: 'fixture' })
            .setIssuer(oidc.issuer)
            .setAudience(oidc.clientId)
            .setSubject('fixture-subject')
            .setIssuedAt()
            .setExpirationTime('1h')
            .sign(privateKey),
        });
      }),
    );
    try {
      const login = await req('/api/v1/auth/login');
      expect(login.status).toBe(302);
      const url = new URL(login.headers.get('location')!);
      expect(url.searchParams.get('code_challenge_method')).toBe('S256');
      expect(url.searchParams.get('scope')).toBe('openid profile');
      nonce = url.searchParams.get('nonce')!;
      const state = url.searchParams.get('state')!;
      const pending = await env.DB.prepare('SELECT verifier FROM oidc_pending WHERE id=?')
        .bind(await hash(state))
        .first<any>();
      verifier = pending.verifier;
      expect((await req('/api/v1/auth/callback?state=wrong&code=fixture')).status).toBe(400);
      const callback = await app.request(
        'http://localhost/api/v1/auth/callback?' + new URLSearchParams({ state, code: 'fixture' }),
        { headers: { Cookie: `openmaas_login=${state}` } },
        env,
      );
      expect(callback.status).toBe(302);
      expect(callback.headers.get('set-cookie')).toContain('HttpOnly');
      const sessionToken = callback.headers
        .get('set-cookie')!
        .match(/openmaas_session=([^;]+)/)![1];
      const session = await (
        await req('/api/v1/auth/session', 'GET', undefined, sessionToken)
      ).json();
      expect(session).toMatchObject({
        authenticated: true,
        owner: oidc.issuer + '|fixture-subject',
        admin: false,
      });
      const repeated = await app.request(
        'http://localhost/api/v1/auth/callback?' + new URLSearchParams({ state, code: 'fixture' }),
        { headers: { Cookie: `openmaas_login=${state}` } },
        env,
      );
      expect(repeated.status).toBe(400);
    } finally {
      await env.DB.prepare('UPDATE settings SET body=?').bind(JSON.stringify(cfg)).run();
    }
  });
  it('manual source retains namespace and explicit cancellation; stopped sources are visible without exposing data', async () => {
    const s = SourceSchema.parse({
      ...source,
      manual: [{ id: 'test', title: 'Cancelled', category: 'event', status: 'cancelled' }],
    });
    const r = await loadSource(s, env);
    expect(r.items[0].body).toMatchObject({ id: 'events:test', status: 'cancelled' });
    await env.DB.prepare('UPDATE settings SET body=?')
      .bind(JSON.stringify({ ...cfg, sources: [{ ...source, enabled: false }] }))
      .run();
    try {
      expect(await (await req('/api/v1/activities')).json()).toEqual([]);
      expect(await (await req('/api/v1/sources')).json()).toMatchObject([{ status: 'disabled' }]);
    } finally {
      await env.DB.prepare('UPDATE settings SET body=?').bind(JSON.stringify(cfg)).run();
    }
  });
});

describe('Accommodation search and deployment variants', () => {
  it('searches vacancy by user dates, caches responses, retains provider checkout and never confirms booking', async () => {
    const s = SourceSchema.parse({
      ...source,
      id: 'hotel',
      kind: 'rakuten',
      secretRef: 'RAKUTEN_KEY',
      params: { applicationId: 'app', hotelNo: '1' },
    });
    env.RAKUTEN_KEY = 'fixture';
    await env.DB.prepare('UPDATE settings SET body=?')
      .bind(JSON.stringify({ ...cfg, sources: [source, s] }))
      .run();
    const f = vi.fn(async (u: any, init: any) => {
      expect(String(u)).toContain('VacantHotelSearch/20170426');
      expect(String(u)).toContain('checkinDate=2026-10-10');
      expect(init.headers.accessKey).toBe('fixture');
      return jsonResponse({
        hotels: [
          {
            hotel: [
              {
                hotelBasicInfo: {
                  hotelNo: 1,
                  hotelName: 'Vacant Hotel',
                  latitude: 35,
                  longitude: 139,
                  planListUrl: 'https://example.org/provider-booking',
                },
              },
            ],
          },
        ],
      });
    });
    vi.stubGlobal('fetch', f);
    try {
      const input = {
        sourceId: 'hotel',
        checkinDate: '2026-10-10',
        checkoutDate: '2026-10-11',
        adults: 2,
      };
      const a = await (await req('/api/v1/accommodations/search', 'POST', input)).json();
      expect(a[0].bookingWindow.adults).toBe(2);
      expect(a[0].actions[0].url).toBe('https://example.org/provider-booking');
      expect(a[0]).not.toHaveProperty('reservation');
      expect((await req('/api/v1/accommodations/search', 'POST', input)).status).toBe(200);
      expect(f).toHaveBeenCalledTimes(1);
      expect((await req('/api/v1/activities/' + encodeURIComponent(a[0].id))).status).toBe(200);
      const p = await (
        await req('/api/v1/plans', 'POST', {
          title: 'Hotel',
          items: [
            { type: 'accommodation', referenceId: a[0].id, title: a[0].title, status: 'saved' },
          ],
        })
      ).json();
      expect(p.items[0].status).toBe('saved');
      expect(
        (
          await req('/api/v1/accommodations/search', 'POST', {
            ...input,
            checkoutDate: '2026-10-09',
          })
        ).status,
      ).toBe(400);
    } finally {
      await env.DB.prepare('UPDATE settings SET body=?').bind(JSON.stringify(cfg)).run();
    }
  });
  it('switches all four deployment examples through the same API', async () => {
    try {
      for (const name of ['event-transit', 'tourism', 'local-transit', 'ticket-sales']) {
        const c = ConfigSchema.parse(
          JSON.parse(
            readFileSync(
              new URL(`../../../examples/platform/${name}.json`, import.meta.url),
              'utf8',
            ),
          ),
        );
        c.admins = cfg.admins;
        expect((await req('/api/v1/admin/config', 'PUT', c, 'admin')).status).toBe(200);
        expect((await (await req('/api/v1/config')).json()).features).toEqual(c.features);
      }
    } finally {
      await env.DB.prepare('UPDATE settings SET body=?').bind(JSON.stringify(cfg)).run();
    }
  });
});

describe('Additional connection edge cases', () => {
  it('GBFS 3.0 accepts RFC3339 freshness and localized station names', async () => {
    const s = SourceSchema.parse({ ...source, kind: 'gbfs', url: 'https://example.org/gbfs.json' });
    const r = await loadSource(s, env, (async (u) =>
      jsonResponse(
        String(u).endsWith('gbfs.json')
          ? {
              version: '3.0',
              ttl: 60,
              data: {
                feeds: [
                  { name: 'station_information', url: 'https://example.org/stations.json' },
                  { name: 'station_status', url: 'https://example.org/status.json' },
                ],
              },
            }
          : {
              version: '3.0',
              ttl: 60,
              last_updated: '2020-01-01T00:00:00Z',
              data: {
                stations: [
                  {
                    station_id: 's',
                    name: [{ language: 'ja', text: '試験ポート' }],
                    num_vehicles_available: 2,
                  },
                ],
              },
            },
      )) as typeof fetch);
    expect(r.items[0].body).toMatchObject({ name: '試験ポート', stale: true });
  });
  it('uses an explicit reception time and never applies the default margin twice', () => {
    expect(
      timing({ ...event, receptionStart: '2026-10-10T09:30:00+09:00' }, 'outbound').dateTime,
    ).toBe('2026-10-10T00:30:00.000Z');
  });
  it('rate limits public live search before calling a provider', async () => {
    env.SEARCH_LIMITER = { limit: async () => ({ success: false }) };
    try {
      expect((await req('/api/v1/journeys', 'POST', {})).status).toBe(429);
    } finally {
      delete env.SEARCH_LIMITER;
    }
  });
  it('simultaneous checkout requests reuse the provider idempotency key and reject mismatched payments', async () => {
    const provider = new Map<string, any>();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_u, init: any) => {
        const key = init.headers['Idempotency-Key'];
        if (!provider.has(key)) {
          const body = new URLSearchParams(init.body);
          provider.set(key, {
            id: 'cs_concurrent',
            url: 'https://checkout.stripe.com/test',
            metadata: { orderId: body.get('metadata[orderId]') },
            amount_total: 500,
            currency: 'jpy',
            payment_status: 'unpaid',
          });
        }
        return jsonResponse(provider.get(key));
      }),
    );
    const results = await Promise.all([
      req('/api/v1/orders', 'POST', { productId: 'one' }, 'user', {
        'Idempotency-Key': 'concurrent-requests',
      }),
      req('/api/v1/orders', 'POST', { productId: 'one' }, 'user', {
        'Idempotency-Key': 'concurrent-requests',
      }),
    ]);
    expect(results.map((r) => r.status)).toEqual([201, 201]);
    const rows = await Promise.all(results.map((r) => r.json()));
    expect(rows[0].id).toBe(rows[1].id);
    expect(provider.size).toBe(1);
    await expect(
      fulfill(env, { ...provider.values().next().value, payment_status: 'paid', amount_total: 1 }),
    ).rejects.toThrow('Payment does not match');
    expect(
      (await env.DB.prepare('SELECT status FROM orders WHERE id=?').bind(rows[0].id).first<any>())
        ?.status,
    ).toBe('pending');
  });
});

describe('Reusable reservation sandbox contract', () => {
  it('checks duplicate requests, fulfillment and repeat cancellation without assuming shared checkout', async () => {
    const { verifyReservationContract } = await import('./reservation-contract');
    let status: 'confirmed' | 'cancelled' = 'confirmed';
    const reservation = () => ({
      id: 'r',
      providerId: 'sandbox',
      externalId: 'external-r',
      status,
      offerId: 'offer',
      actions: [],
    });
    const connector = {
      capabilities: ['search', 'quote', 'reserve', 'lookup', 'fulfill', 'cancel'] as const,
      search: async () => [],
      quote: async () => ({
        id: 'offer',
        providerId: 'sandbox',
        expiresAt: new Date(Date.now() + 600000).toISOString(),
        amount: 500,
        currency: 'JPY',
        terms: 'Sandbox cancellation',
        paymentHandledBy: 'provider' as const,
      }),
      reserve: async () => reservation(),
      lookup: async () => reservation(),
      fulfill: async () => [
        {
          id: 't',
          providerId: 'sandbox',
          externalId: 'ext-t',
          status: 'valid' as const,
          display: { type: 'text' as const, value: 'fixture' },
          terms: 'fixture',
        },
      ],
      cancel: async () => {
        status = 'cancelled';
        return reservation();
      },
    };
    expect(await verifyReservationContract(connector, {}, 'sandbox-key')).toMatchObject({
      status: 'verified',
      paymentHandledBy: 'provider',
      reservation: { status: 'cancelled' },
    });
  });
  it('fails non-idempotent connectors and keeps uncertain reservations unconfirmed', async () => {
    const { verifyReservationContract } = await import('./reservation-contract');
    let n = 0;
    const connector = {
      capabilities: ['search', 'quote', 'reserve', 'lookup'] as const,
      search: async () => [],
      quote: async () => ({
        id: 'o',
        providerId: 'fixture',
        expiresAt: new Date(Date.now() + 600000).toISOString(),
        amount: 500,
        currency: 'JPY',
        terms: 'x',
        paymentHandledBy: 'provider' as const,
      }),
      reserve: async () => ({
        id: 'r',
        providerId: 'fixture',
        externalId: String(++n),
        status: 'unknown' as const,
        offerId: 'o',
        actions: [],
      }),
      lookup: async () => ({
        id: 'r',
        providerId: 'fixture',
        externalId: 'stable',
        status: 'unknown' as const,
        offerId: 'o',
        actions: [],
      }),
    };
    await expect(verifyReservationContract(connector, {}, 'key')).rejects.toThrow(
      'Duplicate reservation',
    );
    connector.reserve = async () => ({
      id: 'r',
      providerId: 'fixture',
      externalId: 'stable',
      status: 'unknown',
      offerId: 'o',
      actions: [],
    });
    expect(await verifyReservationContract(connector, {}, 'key')).toMatchObject({
      status: 'requires-reconciliation',
      reservation: { status: 'unknown' },
    });
  });
});

describe('Luma organization details and calendar semantics', () => {
  it('restricts organization results to configured calendars and preserves provider price currency units', async () => {
    const s = SourceSchema.parse({
      ...source,
      id: 'luma-org',
      kind: 'luma',
      secretRef: 'LUMA_KEY',
      params: { scope: 'organization', calendarIds: 'allowed' },
    });
    const r = await loadSource(s, { ...env, LUMA_KEY: 'fixture' }, (async (u) => {
      expect(String(u)).toContain('/organizations/events/list');
      return jsonResponse({
        entries: [
          {
            id: 'a',
            name: 'Allowed',
            visibility: 'public',
            calendar_id: 'allowed',
            location_type: 'offline',
            location_visibility: 'public',
            display_price: { amount: 1500, currency: 'usd', is_flexible: false },
            url: 'https://luma.com/a',
          },
          { id: 'b', name: 'Other calendar', visibility: 'public', calendar_id: 'other' },
        ],
        has_more: false,
      });
    }) as typeof fetch);
    expect(r.items).toHaveLength(1);
    expect(r.items[0].body).toMatchObject({ price: { amount: 15, currency: 'USD' } });
  });
  it('fetches only already-imported public Luma details and caches public description without guests or meeting URL', async () => {
    const s = SourceSchema.parse({
      ...source,
      id: 'luma-detail',
      kind: 'luma',
      secretRef: 'LUMA_KEY',
    });
    env.LUMA_KEY = 'fixture';
    const entry = {
      id: 'evt-detail',
      name: 'Detail',
      visibility: 'public',
      location_type: 'offline',
      location_visibility: 'public',
      coordinate: { latitude: 35, longitude: 139 },
      start_at: event.start,
      url: 'https://luma.com/detail',
    };
    const a = normalizeLuma(s, entry);
    await env.DB.prepare('UPDATE settings SET body=?')
      .bind(JSON.stringify({ ...cfg, sources: [source, s] }))
      .run();
    await publish(env, s.id, [{ kind: 'activity', id: a.id, body: a }], 300);
    const f = vi.fn(async (u) => {
      expect(String(u)).toContain('/v1/events/get?event_id=evt-detail');
      return jsonResponse({
        ...entry,
        description_md: '公開説明',
        meeting_url: 'https://private.example.org',
        guests: [{ name: 'Private guest' }],
      });
    });
    vi.stubGlobal('fetch', f);
    try {
      const body = await (await req('/api/v1/activities/' + encodeURIComponent(a.id))).json();
      expect(body.description).toBe('公開説明');
      expect(body).not.toHaveProperty('meeting_url');
      expect(body).not.toHaveProperty('guests');
      expect((await req('/api/v1/activities/' + encodeURIComponent(a.id))).status).toBe(200);
      expect(f).toHaveBeenCalledTimes(1);
      expect((await req('/api/v1/activities/luma-detail:unknown')).status).toBe(404);
    } finally {
      await env.DB.prepare('UPDATE settings SET body=?').bind(JSON.stringify(cfg)).run();
    }
  });
  it('exports accommodation dates as tentative all-day events without invented check-in times', () => {
    const text = calendar('p', 'Hotel', [
      { title: 'Hotel', bookingWindow: { checkinDate: '2026-10-10', checkoutDate: '2026-10-11' } },
    ]);
    expect(text).toContain('DTSTART;VALUE=DATE:20261010');
    expect(text).toContain('DTEND;VALUE=DATE:20261011');
    expect(text).toContain('STATUS:TENTATIVE');
  });
});

describe('Deployment connectors and non-mutating diagnostics', () => {
  it('rejects unknown provider fields and enabling unsupported transactions', () => {
    expect(() =>
      SourceSchema.parse({ ...source, kind: 'ticketmaster', params: { fakeField: 'x' } }),
    ).toThrow();
    expect(() =>
      SourceSchema.parse({ ...source, kind: 'luma', operations: ['reserve'] }),
    ).toThrow();
  });
  it('reports missing credentials, permissions and rate limits without changing records', async () => {
    const s = SourceSchema.parse({
      ...source,
      id: 'diagnose',
      kind: 'luma',
      secretRef: 'DIAG_KEY',
    });
    const { checkConnection } = await import('../src/diagnostics');
    expect((await checkConnection(s, env)).status).toBe('credential-required');
    env.DIAG_KEY = 'never-return-this-secret';
    for (const [code, status] of [
      [403, 'permission-denied'],
      [429, 'rate-limited'],
    ] as const) {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => jsonResponse({}, code)),
      );
      const r = await checkConnection(s, env);
      expect(r.status).toBe(status);
      expect(JSON.stringify(r)).not.toContain('never-return-this-secret');
    }
    expect(
      await env.DB.prepare('SELECT id FROM source_state WHERE id=?').bind(s.id).first(),
    ).toBeNull();
  });
  it('imports ODPT stations, station/train timetables and service information independently', async () => {
    const s = SourceSchema.parse({
      ...source,
      id: 'odpt',
      kind: 'odpt',
      secretRef: 'ODPT_KEY',
      params: {
        datasets: 'Station,StationTimetable,TrainTimetable,TrainInformation',
        'odpt:operator': 'odpt.Operator:Test',
      },
    });
    const result = await loadSource(s, { ...env, ODPT_KEY: 'fixture' }, async (u) => {
      const url = new URL(String(u));
      expect(url.searchParams.get('odpt:operator')).toBe('odpt.Operator:Test');
      expect(url.searchParams.has('datasets')).toBe(false);
      return jsonResponse([
        {
          'owl:sameAs': 'odpt.Test:' + url.pathname.split(':').at(-1),
          'dc:title': '駅',
          'geo:lat': 35,
          'geo:long': 139,
          'odpt:stationTimetableObject': [{ 'odpt:departureTime': '25:10' }],
        },
      ]);
    });
    expect(result.items.map((i) => i.kind)).toEqual([
      'odpt:stops',
      'odpt:StationTimetable',
      'odpt:TrainTimetable',
      'realtime',
    ]);
    expect(result.items[0].body).toMatchObject({ stop_name: '駅', stop_lat: 35 });
  });
  it('keeps Eventbrite unlisted events private and Ticketmaster cancelled events explicit', async () => {
    const e = SourceSchema.parse({
      ...source,
      id: 'eb',
      kind: 'eventbrite',
      secretRef: 'KEY',
      params: { organizationId: 'org' },
    });
    const result = await loadSource(e, { ...env, KEY: 'key' }, async (u) => {
      expect(String(u)).toContain('/organizations/org/events/');
      return jsonResponse({
        events: [
          {
            id: 'yes',
            listed: true,
            name: { text: 'Public' },
            start: { utc: '2026-10-10T01:00:00Z' },
            venue: { name: 'Venue' },
            url: 'https://eventbrite.com/e/yes',
          },
          { id: 'private', listed: false },
        ],
        pagination: { has_more_items: false },
      });
    });
    expect(result.items).toHaveLength(1);
    expect((result.items[0].body as any).start).toBe('2026-10-10T01:00:00Z');
    const t = SourceSchema.parse({ ...e, kind: 'ticketmaster', params: { countryCode: 'JP' } });
    const r = await loadSource(t, { ...env, KEY: 'key' }, async () =>
      jsonResponse({
        page: { totalPages: 1 },
        _embedded: {
          events: [
            {
              id: 'cancelled',
              name: 'Show',
              dates: { status: { code: 'cancelled' } },
              url: 'https://ticketmaster.com/event',
            },
          ],
        },
      }),
    );
    expect(r.items[0].body).toMatchObject({ status: 'cancelled' });
  });
  it('uses TomTom availability IDs from search and never declares parking reservations', async () => {
    const s = SourceSchema.parse({
      ...source,
      id: 'parking',
      kind: 'tomtom',
      secretRef: 'KEY',
      params: { lat: '35', lon: '139' },
    });
    const r = await loadSource(s, { ...env, KEY: 'key' }, async (u) => {
      const url = new URL(String(u));
      if (url.pathname.includes('poiSearch'))
        return jsonResponse({
          results: [
            {
              id: 'p',
              poi: { name: 'Parking' },
              position: { lat: 35, lon: 139 },
              dataSources: { parkingAvailability: { id: 'avail' } },
            },
          ],
        });
      expect(url.pathname).toBe('/search/2/parkingAvailability.json');
      expect(url.searchParams.get('parkingAvailability')).toBe('avail');
      return jsonResponse({
        statuses: [{ current: { emptySpots: 2, updatedAt: '2026-10-07T01:00:00Z' } }],
      });
    });
    expect(r.items[0].body).toMatchObject({ category: 'parking' });
    expect(() => SourceSchema.parse({ ...s, operations: ['reserve'] })).toThrow();
  });
});

describe('Persistent provider reservations', () => {
  let s: any, offer: any;
  beforeAll(async () => {
    s = SourceSchema.parse({
      ...source,
      id: 'square-test',
      kind: 'square',
      secretRef: 'SQUARE_TEST',
      params: { locationId: 'location', environment: 'sandbox' },
      operations: ['quote', 'reserve', 'lookup', 'cancel'],
    });
    env.SQUARE_TEST = 'fixture';
  });
  async function enable() {
    await env.DB.prepare('UPDATE settings SET body=?')
      .bind(JSON.stringify({ ...cfg, sources: [source, s] }))
      .run();
    await env.DB.prepare('INSERT OR REPLACE INTO connection_checks VALUES(?,?,?,?)')
      .bind(
        s.id,
        'available',
        JSON.stringify({ checkedAt: new Date().toISOString() }),
        new Date().toISOString(),
      )
      .run();
  }
  afterEach(async () => {
    await env.DB.prepare('UPDATE settings SET body=?').bind(JSON.stringify(cfg)).run();
  });
  async function quote() {
    await enable();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (u) =>
        String(u).includes('/catalog/')
          ? jsonResponse({
              object: {
                item_variation_data: {
                  available_for_booking: true,
                  name: 'Appointment',
                  price_money: { amount: 1500, currency: 'JPY' },
                },
              },
            })
          : jsonResponse({
              availabilities: [
                {
                  location_id: 'location',
                  start_at: '2026-10-10T01:00:00Z',
                  appointment_segments: [
                    {
                      service_variation_id: 'service',
                      service_variation_version: 1,
                      team_member_id: 'member',
                      duration_minutes: 60,
                    },
                  ],
                },
              ],
            }),
      ),
    );
    const r = await req('/api/v1/offers', 'POST', {
      sourceId: s.id,
      query: {
        serviceVariationId: 'service',
        start: '2026-10-10T00:00:00Z',
        end: '2026-10-10T03:00:00Z',
      },
    });
    expect(r.status).toBe(200);
    offer = (await r.json())[0];
    expect(offer).not.toHaveProperty('providerData');
  }
  it('creates one provider request under concurrency and isolates ownership', async () => {
    await quote();
    const f = vi.fn(async (_u, init: any) => {
      const b = JSON.parse(init.body);
      if (String(_u).endsWith('/customers')) return jsonResponse({ customer: { id: 'customer' } });
      expect(b.booking.customer_id).toBe('customer');
      expect(b.booking.location_id).toBe('location');
      return jsonResponse({ booking: { id: 'booking-one', status: 'ACCEPTED', version: 1 } });
    });
    vi.stubGlobal('fetch', f);
    const results = await Promise.all(
      [1, 2].map(() =>
        req(
          '/api/v1/reservations',
          'POST',
          {
            offerId: offer.id,
            input: {
              firstName: 'Test',
              lastName: 'User',
              email: 'test@example.org',
              phone: '+819012345678',
            },
          },
          'user',
          { 'Idempotency-Key': 'square-concurrent' },
        ),
      ),
    );
    const bodies = await Promise.all(results.map((r) => r.json()));
    expect(bodies[0].id).toBe(bodies[1].id);
    expect(f).toHaveBeenCalledTimes(2);
    expect(
      (await req('/api/v1/reservations/' + bodies[0].id, 'GET', undefined, 'other')).status,
    ).toBe(404);
    const r = await req('/api/v1/reservations/' + bodies[0].id);
    expect((await r.json()).status).toBe('confirmed');
  });
  it('never repeats an unknown create and persists cancellation failures until reconciliation', async () => {
    await quote();
    const f = vi.fn(async () => {
      throw new Error('timeout after upstream accepted');
    });
    vi.stubGlobal('fetch', f);
    const dto = {
      offerId: offer.id,
      input: {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.org',
        phone: '+819012345678',
      },
    };
    const a = await (
      await req('/api/v1/reservations', 'POST', dto, 'user', {
        'Idempotency-Key': 'square-unknown',
      })
    ).json();
    expect(a.status).toBe('unknown');
    await req('/api/v1/reservations', 'POST', dto, 'user', { 'Idempotency-Key': 'square-unknown' });
    expect(f).toHaveBeenCalledTimes(1);
    vi.stubGlobal(
      'fetch',
      vi.fn(async (u) =>
        String(u).endsWith('/customers')
          ? jsonResponse({ customer: { id: 'customer' } })
          : jsonResponse({ booking: { id: 'cancel-target', status: 'ACCEPTED', version: 1 } }),
      ),
    );
    const b = await (
      await req('/api/v1/reservations', 'POST', dto, 'user', {
        'Idempotency-Key': 'square-cancel-target',
      })
    ).json();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (u) =>
        String(u).endsWith('/cancel')
          ? jsonResponse({}, 503)
          : jsonResponse({ booking: { id: 'cancel-target', status: 'ACCEPTED', version: 1 } }),
      ),
    );
    expect((await req(`/api/v1/reservations/${b.id}/cancel`, 'POST', {})).status).toBe(202);
    expect((await (await req('/api/v1/reservations/' + b.id)).json()).status).toBe(
      'cancel_pending',
    );
    await env.DB.prepare('UPDATE provider_operations SET next_attempt=? WHERE reservation_id=?')
      .bind(new Date(0).toISOString(), b.id)
      .run();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          booking: { id: 'cancel-target', status: 'CANCELLED_BY_CUSTOMER', version: 2 },
        }),
      ),
    );
    const { recoverReservations } = await import('../src/transactions');
    await recoverReservations(env);
    expect((await (await req('/api/v1/reservations/' + b.id)).json()).status).toBe('cancelled');
  });
  it('rejects expired offers, arbitrary contact fields and unavailable connector operations', async () => {
    await quote();
    expect(
      (
        await req(
          '/api/v1/reservations',
          'POST',
          {
            offerId: offer.id,
            input: {
              firstName: 'Test',
              lastName: 'User',
              email: 'test@example.org',
              phone: '+819012345678',
              cardNumber: 'bad',
            },
          },
          'user',
          { 'Idempotency-Key': 'invalid-contact' },
        )
      ).status,
    ).toBe(400);
    await env.DB.prepare('UPDATE provider_offers SET expires_at=? WHERE id=?')
      .bind(new Date(0).toISOString(), offer.id)
      .run();
    expect(
      (
        await req(
          '/api/v1/reservations',
          'POST',
          {
            offerId: offer.id,
            input: {
              firstName: 'Test',
              lastName: 'User',
              email: 'test@example.org',
              phone: '+819012345678',
            },
          },
          'user',
          { 'Idempotency-Key': 'expired-offer' },
        )
      ).status,
    ).toBe(409);
  });
});

describe('OAuth token protection', () => {
  it('encrypts tokens at rest and refuses altered ciphertext or the wrong key', async () => {
    const { encryptTokens, decryptTokens } = await import('../src/google-calendar');
    env.OAUTH_ENCRYPTION_KEY = 'fixture-key';
    const encrypted = await encryptTokens(env, { refresh_token: 'never-visible' });
    expect(encrypted).not.toContain('never-visible');
    expect(await decryptTokens(env, encrypted)).toEqual({ refresh_token: 'never-visible' });
    await expect(
      decryptTokens({ ...env, OAUTH_ENCRYPTION_KEY: 'wrong' }, encrypted),
    ).rejects.toThrow();
  });
});

describe('Merchant provider contracts and payment isolation', () => {
  it('Booking previews and creates an order using the provider token, never storing card or booker fields', async () => {
    const s = SourceSchema.parse({
      ...source,
      id: 'booking-fixture',
      kind: 'booking',
      secretRef: 'BOOKING_KEY',
      params: {
        affiliateId: 'affiliate',
        bookerCountry: 'jp',
        accommodationIds: '42',
        paymentMode: 'card',
        environment: 'sandbox',
      },
      operations: ['quote', 'reserve', 'lookup', 'cancel'],
    });
    env.BOOKING_KEY = 'fixture';
    await env.DB.prepare('UPDATE settings SET body=?')
      .bind(JSON.stringify({ ...cfg, sources: [source, s] }))
      .run();
    await env.DB.prepare('INSERT OR REPLACE INTO connection_checks VALUES(?,?,?,?)')
      .bind(
        s.id,
        'configured',
        JSON.stringify({ checkedAt: new Date().toISOString() }),
        new Date().toISOString(),
      )
      .run();
    const card = { number: '4111111111111111', cvc: '987', month: '12', year: '2030' };
    const f = vi.fn(async (u, init: any) => {
      const b = JSON.parse(init.body);
      expect(String(u)).toContain('demandapi-sandbox.booking.com/3.2/');
      expect(init.headers['X-Affiliate-Id']).toBe('affiliate');
      if (String(u).endsWith('/preview')) {
        expect(b.accommodation.products[0].id).toBe('product');
        return jsonResponse({
          data: {
            order_token: 'provider-order-token',
            accommodation: {
              price: { total: '150' },
              currency: { booker: 'JPY' },
              products: [{ id: 'product', policies: { cancellation: 'policy' } }],
            },
          },
        });
      }
      expect(b.order_token).toBe('provider-order-token');
      expect(b.payment.card.number).toBe(card.number);
      expect(b.payment.card.expiry_date).toBe('2030-12');
      return jsonResponse({
        data: { order: 'order-provider', accommodation: { reservation: 'reservation-provider' } },
      });
    });
    vi.stubGlobal('fetch', f);
    try {
      const offers = await (
        await req('/api/v1/offers', 'POST', {
          sourceId: s.id,
          query: {
            accommodationId: 42,
            productId: 'product',
            checkin: '2026-11-10',
            checkout: '2026-11-11',
            adults: 1,
          },
        })
      ).json();
      expect(offers[0]).not.toHaveProperty('providerData');
      const result = await req(
        '/api/v1/reservations',
        'POST',
        {
          offerId: offers[0].id,
          input: {
            name: { first: 'PrivateFirst', last: 'PrivateLast' },
            email: 'private@example.org',
            phone: '+819012345678',
            address: { line: 'PrivateStreet', city: 'Tokyo', country: 'JP', postCode: '1000001' },
            paymentTiming: 'pay_online_now',
            card,
          },
        },
        'user',
        { 'Idempotency-Key': 'booking-provider-flow' },
      );
      expect(result.status).toBe(201);
      expect(await result.json()).toMatchObject({
        status: 'confirmed',
        paymentHandledBy: 'provider',
      });
      const rows = await env.DB.prepare('SELECT body FROM provider_reservations WHERE source_id=?')
        .bind(s.id)
        .all<any>();
      const saved = JSON.stringify(rows);
      expect(saved).not.toContain(card.number);
      expect(saved).not.toContain('PrivateFirst');
      expect(saved).not.toContain('PrivateStreet');
      expect(saved).not.toContain('private@example.org');
      expect(f).toHaveBeenCalledTimes(2);
    } finally {
      await env.DB.prepare('UPDATE settings SET body=?').bind(JSON.stringify(cfg)).run();
    }
  });
  it('Viator requires a bound hold before booking and produces vouchers only after confirmation', async () => {
    const { merchantQuote, prepareViator, merchantReserve } = await import('../src/merchant');
    const s = SourceSchema.parse({
      ...source,
      id: 'viator-fixture',
      kind: 'viator',
      secretRef: 'VIATOR_KEY',
      params: { productCodes: 'P1', paymentMode: 'iframe', environment: 'sandbox' },
    });
    env.VIATOR_KEY = 'fixture';
    vi.stubGlobal(
      'fetch',
      vi.fn(async (u, init: any) => {
        if (String(u).endsWith('/products/P1'))
          return jsonResponse({
            title: 'Fixture activity',
            bookingQuestions: ['FULL_NAMES_FIRST'],
          });
        if (String(u).endsWith('/products/booking-questions'))
          return jsonResponse({
            bookingQuestions: [
              {
                id: 'FULL_NAMES_FIRST',
                label: 'First name',
                type: 'STRING',
                group: 'PER_TRAVELER',
                required: 'MANDATORY',
              },
            ],
          });
        const b = JSON.parse(init.body);
        if (String(u).endsWith('/availability/check'))
          return jsonResponse({
            currency: 'USD',
            bookableItems: [
              {
                available: true,
                productOptionCode: 'OPT',
                totalPrice: { price: { recommendedRetailPrice: 50 } },
              },
            ],
          });
        if (String(u).endsWith('/hold')) {
          expect(b.paymentDataSubmissionMode).toBe('VIATOR_FORM');
          expect(b.hostingUrl).toBe(env.APP_ORIGIN);
          return jsonResponse({
            cartRef: 'cart',
            paymentSessionToken: 'private-session',
            totalHeldPrice: { price: { recommendedRetailPrice: 50 } },
            items: [
              {
                bookingRef: 'booking',
                status: 'BOOKABLE',
                bookingHoldInfo: {
                  availability: { validUntil: new Date(Date.now() + 100000).toISOString() },
                },
                cancellationPolicy: { description: 'Free until deadline' },
              },
            ],
          });
        }
        expect(b.cartRef).toBe('cart');
        expect(b.paymentToken).toBe('STK-provider');
        return jsonResponse({
          items: [
            {
              bookingRef: 'booking',
              status: 'CONFIRMED',
              voucherInfo: { url: 'https://viator.com/voucher' },
            },
          ],
        });
      }),
    );
    const offers = await merchantQuote(
      s,
      env,
      {
        productCode: 'P1',
        travelDate: '2026-11-10',
        currency: 'USD',
        paxMix: [{ ageBand: 'ADULT', numberOfTravelers: 1 }],
      },
      '127.0.0.1',
    );
    const input = {
      name: { first: 'First', last: 'Last' },
      email: 'test@example.org',
      phone: '+819012345678',
      paymentToken: 'STK-provider',
      answers: [],
    };
    await expect(merchantReserve(s, env, offers[0], input, 'key', '127.0.0.1')).rejects.toThrow(
      'Prepare',
    );
    const held = await prepareViator(s, env, offers[0], 'offer-bound');
    expect(held.amount).toBe(50);
    await expect(merchantReserve(s, env, held, input, 'key', '127.0.0.1')).rejects.toThrow(
      'Required booking',
    );
    input.answers.push({ question: 'FULL_NAMES_FIRST', answer: 'First', travelerNum: 1 } as never);
    expect(await merchantReserve(s, env, held, input, 'key', '127.0.0.1')).toMatchObject({
      status: 'confirmed',
      actions: [{ url: 'https://viator.com/voucher' }],
    });
  });
  it('Expedia signs requests and follows only links returned by the fixed API host', async () => {
    const { expediaRequest } = await import('../src/inventory');
    const { merchantQuote, merchantReserve } = await import('../src/merchant');
    const s = SourceSchema.parse({
      ...source,
      id: 'expedia-fixture',
      kind: 'expedia',
      secretRef: 'EXPEDIA_KEY',
      params: {
        propertyIds: '42',
        countryCode: 'JP',
        currency: 'JPY',
        language: 'ja-JP',
        salesChannel: 'website',
        salesEnvironment: 'hotel_only',
        paymentMode: 'card',
        environment: 'sandbox',
      },
    });
    env.EXPEDIA_KEY = 'fixture';
    env.EXPEDIA_KEY_SHARED = 'secret';
    vi.stubGlobal(
      'fetch',
      vi.fn(async (u, init: any) => {
        expect(String(u)).toContain('https://test.ean.com/v3/');
        expect(init.headers.Authorization).toMatch(
          /^EAN APIKey=fixture,Signature=[a-f0-9]{128},timestamp=\d+$/,
        );
        if (String(u).includes('/availability'))
          return jsonResponse([
            {
              rooms: [
                {
                  id: 'room',
                  rates: [
                    {
                      id: 'rate',
                      links: {
                        price_check: {
                          href: '/v3/properties/42/rooms/room/rates/rate?token=opaque',
                        },
                      },
                    },
                  ],
                },
              ],
            },
          ]);
        if (String(u).includes('/rates/'))
          return jsonResponse({
            status: 'matched',
            occupancy_pricing: {
              '1': {
                totals: { inclusive: { request_currency: { value: '150', currency: 'JPY' } } },
              },
            },
            links: { book: { href: '/v3/itineraries?token=opaque' } },
          });
        const b = JSON.parse(init.body);
        expect(b.payments[0].number).toBe('4111111111111111');
        return jsonResponse({
          itinerary_id: 'trip',
          links: { retrieve: { href: '/v3/itineraries/trip?token=read' } },
        });
      }),
    );
    await expect(expediaRequest(s, env, 'https://attacker.example/v3/itineraries')).rejects.toThrow(
      'Untrusted',
    );
    const q = {
      propertyId: '42',
      roomId: 'room',
      rateId: 'rate',
      checkin: '2026-11-10',
      checkout: '2026-11-11',
      adults: 1,
    };
    const offers = await merchantQuote(s, env, q, '203.0.113.1');
    expect(offers[0].amount).toBe(150);
    expect(
      await merchantReserve(
        s,
        env,
        offers[0],
        {
          name: { first: 'First', last: 'Last' },
          email: 'test@example.org',
          phone: { countryCode: '81', number: '9012345678' },
          address: { line: 'Street', city: 'Tokyo', country: 'JP', postCode: '1000001' },
          card: { number: '4111111111111111', cvc: '123', month: '12', year: '2030' },
        },
        'local-key',
        '203.0.113.1',
      ),
    ).toMatchObject({ status: 'pending', externalId: 'trip' });
  });
  it('refuses merchant reserve configuration without a supported payment mode and keeps Masabi specification-gated', async () => {
    expect(() =>
      SourceSchema.parse({
        ...source,
        kind: 'booking',
        operations: ['reserve'],
        params: { affiliateId: 'a', bookerCountry: 'jp' },
      }),
    ).toThrow('payment');
    const { connectorDefinitions } = await import('../src/registry');
    expect(connectorDefinitions.masabi).toMatchObject({
      implemented: false,
      status: 'specification-required',
    });
  });
});

describe('Calendar authorization and signed provider updates', () => {
  it('binds Google authorization to the owner and PKCE, consumes state once and updates with etag', async () => {
    const s = SourceSchema.parse({
      ...source,
      id: 'google-fixture',
      kind: 'google-calendar',
      secretRef: 'GOOGLE_SECRET',
      params: { clientId: 'google-client' },
      operations: ['calendar-write'],
    });
    env.GOOGLE_SECRET = 'fixture';
    env.OAUTH_ENCRYPTION_KEY = 'fixture-key';
    await env.DB.prepare('UPDATE settings SET body=?')
      .bind(JSON.stringify({ ...cfg, sources: [source, s] }))
      .run();
    try {
      const auth = await req('/api/v1/integrations/google-fixture/google/authorize');
      expect(auth.status).toBe(302);
      const u = new URL(auth.headers.get('location')!);
      expect(u.searchParams.get('code_challenge_method')).toBe('S256');
      expect(u.searchParams.get('scope')).toContain('calendar.events.owned');
      const state = u.searchParams.get('state');
      expect(
        (
          await req(
            '/api/v1/integrations/google/callback?state=' + state + '&code=code',
            'GET',
            undefined,
            'other',
          )
        ).status,
      ).toBe(400);
      const f = vi.fn(async (url, init: any) => {
        if (String(url).includes('oauth2.googleapis.com/token')) {
          const b = new URLSearchParams(init.body);
          expect(b.get('code_verifier')).toBeTruthy();
          return jsonResponse({
            access_token: 'access',
            refresh_token: 'refresh-secret',
            expires_in: 3600,
          });
        }
        if (String(url).includes('/calendarList/'))
          return jsonResponse({ id: 'owned', accessRole: 'owner' });
        const b = JSON.parse(init.body);
        expect(b.status).toBe('tentative');
        expect(b.start.dateTime).toBe(event.start);
        expect(b.end.dateTime).toBe(event.end);
        if (init.method === 'PUT') expect(init.headers['If-Match']).toBe('etag-1');
        return jsonResponse({
          id: b.id,
          etag: 'etag-1',
          htmlLink: 'https://calendar.google.com/event',
        });
      });
      vi.stubGlobal('fetch', f);
      expect(
        (await req('/api/v1/integrations/google/callback?state=' + state + '&code=code')).status,
      ).toBe(302);
      expect(
        (await req('/api/v1/integrations/google/callback?state=' + state + '&code=code')).status,
      ).toBe(400);
      const stored = await env.DB.prepare(
        'SELECT encrypted FROM oauth_connections WHERE source_id=?',
      )
        .bind(s.id)
        .first<any>();
      expect(stored.encrypted).not.toContain('refresh-secret');
      const p = await (
        await req('/api/v1/plans', 'POST', {
          title: 'Calendar plan',
          items: [{ type: 'activity', referenceId: event.id, title: event.title }],
        })
      ).json();
      const path = `/api/v1/integrations/google-fixture/google/plans/${p.id}`;
      expect((await req(path, 'POST', { calendarId: 'owned' })).status).toBe(200);
      expect((await req(path, 'POST', { calendarId: 'owned' })).status).toBe(200);
      expect(f).toHaveBeenCalledTimes(5);
    } finally {
      await env.DB.prepare('UPDATE settings SET body=?').bind(JSON.stringify(cfg)).run();
    }
  });
  it('verifies Square URL plus raw body and Uber raw body, rejecting substitutions', async () => {
    const { verifyProviderSignature } = await import('../src/provider-webhooks');
    const body = '{"event_id":"one","escaped":"\\n"}',
      url = 'https://api.example.org/api/v1/webhooks/providers/square';
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode('fixture-key'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const squareBytes = new Uint8Array(
        await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(url + body)),
      ),
      square = btoa(String.fromCharCode(...squareBytes));
    expect(await verifyProviderSignature('square', body, square, 'fixture-key', url)).toBe(true);
    expect(
      await verifyProviderSignature('square', body, square, 'fixture-key', url + '/different'),
    ).toBe(false);
    const bytes = new Uint8Array(
        await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)),
      ),
      uber = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    expect(await verifyProviderSignature('uber', body, uber, 'fixture-key', url)).toBe(true);
    expect(await verifyProviderSignature('uber', body + ' ', uber, 'fixture-key', url)).toBe(false);
  });
  it('marks GTFS-RT static mismatches instead of silently joining another feed', async () => {
    const { realtimeReferenceStatus } = await import('../src/gtfs');
    const ids = new Set(['known']);
    expect(realtimeReferenceStatus({ tripUpdate: { trip: { tripId: 'known' } } }, ids)).toBe(
      'matched',
    );
    expect(realtimeReferenceStatus({ vehicle: { trip: { tripId: 'wrong' } } }, ids)).toBe(
      'unmatched',
    );
    expect(
      realtimeReferenceStatus(
        { vehicle: { trip: { tripId: 'extra', scheduleRelationship: 1 } } },
        ids,
      ),
    ).toBe('additional');
  });
});

describe('Unknown merchant creation recovery', () => {
  it('uses bounded Booking pagination and only the deployment reference', async () => {
    const { merchantLookup } = await import('../src/merchant');
    const s = SourceSchema.parse({
      ...source,
      id: 'booking-recovery',
      kind: 'booking',
      secretRef: 'BOOKING_KEY',
      params: { affiliateId: '42', bookerCountry: 'jp', accommodationIds: '123' },
    });
    env.BOOKING_KEY = 'fixture';
    const calls: any[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_u, init: any) => {
        const body = JSON.parse(init.body);
        calls.push(body);
        return jsonResponse(
          body.page
            ? {
                data: [{ id: 'exact-order', label: 'local-request', status: 'booked' }],
                metadata: { next_page: null },
              }
            : {
                data: [{ id: 'unrelated', label: 'other-request', status: 'booked' }],
                metadata: { next_page: 'cursor' },
              },
        );
      }),
    );
    const result = await merchantLookup(s, env, {
      id: 'local-request',
      created_at: new Date().toISOString(),
      body: JSON.stringify({ currency: 'JPY' }),
    });
    expect(result).toMatchObject({ externalId: 'exact-order', status: 'confirmed' });
    expect(calls[0].maximum_results).toBe(100);
    expect(calls[1]).toEqual({ page: 'cursor' });
  });
  it('decrypts Expedia recovery identity and rejects ambiguous matches', async () => {
    const { merchantLookup } = await import('../src/merchant');
    const { encryptTokens } = await import('../src/tokens');
    const s = SourceSchema.parse({
      ...source,
      id: 'expedia-recovery',
      kind: 'expedia',
      secretRef: 'EXPEDIA_KEY',
      params: {
        propertyIds: '123',
        countryCode: 'JP',
        currency: 'JPY',
        language: 'ja-JP',
        salesChannel: 'website',
        salesEnvironment: 'hotel_only',
      },
    });
    env.EXPEDIA_KEY = 'fixture';
    env.EXPEDIA_KEY_SHARED = 'shared-fixture';
    env.OAUTH_ENCRYPTION_KEY = 'fixture-encryption-key';
    const recovery = await encryptTokens(env, { email: 'recovery@example.org' });
    const row = { id: 'request-ref', body: JSON.stringify({ recovery, customerIp: '127.0.0.1' }) };
    expect(row.body).not.toContain('recovery@example.org');
    let ambiguous = false;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (u) => {
        const url = new URL(String(u));
        expect(url.searchParams.get('affiliate_reference_id')).toBe('request-ref');
        expect(url.searchParams.get('email')).toBe('recovery@example.org');
        const match = {
          affiliate_reference_id: 'request-ref',
          itinerary_id: 'itinerary',
          rooms: [{ status: 'booked' }],
        };
        return jsonResponse(
          ambiguous
            ? [match, match]
            : [match, { affiliate_reference_id: 'other', itinerary_id: 'other' }],
        );
      }),
    );
    expect(await merchantLookup(s, env, row)).toMatchObject({
      externalId: 'itinerary',
      status: 'confirmed',
    });
    ambiguous = true;
    expect(await merchantLookup(s, env, row)).toEqual({ status: 'unknown' });
  });
});

describe('Configuration changes with active reservations', () => {
  it('rejects account/environment retargeting and invalidates changed connection checks', async () => {
    const s = SourceSchema.parse({
      ...source,
      id: 'guarded-square',
      kind: 'square',
      secretRef: 'SQUARE_KEY',
      params: { environment: 'sandbox', locationId: 'location' },
      operations: ['lookup'],
    });
    const current = ConfigSchema.parse({ ...cfg, sources: [s] });
    await env.DB.prepare('UPDATE settings SET body=? WHERE id=1')
      .bind(JSON.stringify(current))
      .run();
    const now = new Date().toISOString();
    await env.DB.prepare('INSERT INTO provider_reservations VALUES(?,?,?,?,?,?,?,?,?,?)')
      .bind(
        'guarded-reservation',
        'owner',
        s.id,
        'offer',
        'guarded-key',
        'booking',
        'pending',
        '{}',
        now,
        now,
      )
      .run();
    await env.DB.prepare('INSERT OR REPLACE INTO connection_checks VALUES(?,?,?,?)')
      .bind(s.id, 'available', '{}', now)
      .run();
    const changed = {
      ...current,
      sources: [{ ...s, params: { ...s.params, environment: 'production' } }],
    };
    expect((await req('/api/v1/admin/config', 'PUT', changed, 'admin')).status).toBe(409);
    expect(
      (await req('/api/v1/admin/config', 'PUT', { ...current, sources: [] }, 'admin')).status,
    ).toBe(409);
    expect(
      (
        await req(
          '/api/v1/admin/config',
          'PUT',
          { ...current, sources: [{ ...s, label: 'Updated label' }] },
          'admin',
        )
      ).status,
    ).toBe(200);
    expect(
      await env.DB.prepare('SELECT * FROM connection_checks WHERE source_id=?').bind(s.id).first(),
    ).toBeNull();
    await env.DB.prepare('DELETE FROM provider_reservations WHERE id=?')
      .bind('guarded-reservation')
      .run();
    await env.DB.prepare('UPDATE settings SET body=? WHERE id=1').bind(JSON.stringify(cfg)).run();
  });
});
