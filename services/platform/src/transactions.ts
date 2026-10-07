import { Hono } from 'hono';
import { z } from 'zod';
import { identity, hash, type AppEnv } from './auth';
import { config } from './store';
import { secret, type Source, type Env } from './model';
import { squareRequest, uberRequest } from './providers';
import { encryptTokens } from './tokens';
import { checkConnection } from './diagnostics';
import { json, UpstreamError } from './http';
import {
  merchantQueries,
  merchantInputs,
  merchantQuote,
  merchantReserve,
  merchantLookup,
  merchantCancel,
  prepareViator,
  cancellationTerms,
} from './merchant';
const coord = z
  .object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) })
  .strict();
export const quoteInputs = {
  square: z
    .object({
      serviceVariationId: z.string().min(1),
      start: z.string().datetime({ offset: true }),
      end: z.string().datetime({ offset: true }),
    })
    .strict()
    .refine((q) => q.end > q.start, 'End must be after start'),
  uber: z.object({ pickup: coord, dropoff: coord }).strict(),
};
export const reserveInputs = {
  square: z
    .object({
      firstName: z.string().min(1).max(100),
      lastName: z.string().min(1).max(100),
      email: z.string().email(),
      phone: z.string().regex(/^\+[1-9]\d{6,14}$/),
    })
    .strict(),
  uber: z
    .object({
      firstName: z.string().min(1).max(100),
      lastName: z.string().min(1).max(100),
      phone: z.string().regex(/^\+[1-9]\d{6,14}$/),
      email: z.string().email().optional(),
    })
    .strict(),
};
async function configured(env: Env, id: string, operation: string) {
  const cfg = await config(env);
  const s = cfg.sources.find((s) => s.id === id && s.enabled);
  if (
    s &&
    (['booking', 'expedia'].includes(s.kind)
      ? !cfg.features.accommodations
      : s.kind === 'uber'
        ? !cfg.features.transit
        : !cfg.features.activities)
  )
    throw new Error('Service category disabled');
  if (!s || !s.operations.includes(operation as never)) throw new Error('Operation is not enabled');
  const check = await env.DB.prepare(
    "SELECT body FROM connection_checks WHERE source_id=? AND status IN ('available','configured')",
  )
    .bind(id)
    .first<{ body: string }>();
  if (!check) throw new Error('Run a connection check before transactions');
  if (Date.now() - Date.parse(JSON.parse(check.body).checkedAt) > 86400000) {
    const refreshed = await checkConnection(s, env);
    if (!['available', 'configured'].includes(refreshed.status))
      throw new Error('Connection check failed; inspect connection status');
  }
  if (!['square', 'uber', 'viator', 'booking', 'expedia'].includes(s.kind))
    throw new Error('Transactional implementation unavailable');
  return s;
}
function visible(body: any) {
  const { retrieveLink, cancelLink, customerIp, recovery, ...publicBody } = body;
  return publicBody;
}
const normalized = (s: Source, r: any) => {
  const b = s.kind === 'square' ? r.booking : r;
  const status =
    s.kind === 'square'
      ? (
          {
            ACCEPTED: 'confirmed',
            PENDING: 'pending',
            CANCELLED_BY_CUSTOMER: 'cancelled',
            CANCELLED_BY_SELLER: 'cancelled',
            DECLINED: 'rejected',
            NO_SHOW: 'completed',
          } as Record<string, string>
        )[b?.status]
      : (
          {
            processing: 'pending',
            accepted: 'confirmed',
            arriving: 'confirmed',
            in_progress: 'confirmed',
            completed: 'completed',
            rider_canceled: 'cancelled',
            driver_canceled: 'cancelled',
            no_drivers_available: 'rejected',
          } as Record<string, string>
        )[b?.status];
  return {
    externalId: s.kind === 'square' ? b?.id : b?.request_id,
    status: status || 'unknown',
    providerStatus: b?.status,
    version: b?.version,
  };
};
async function recordState(env: Env, id: string, body: any) {
  if (
    ![
      'pending',
      'confirmed',
      'cancelled',
      'completed',
      'rejected',
      'unknown',
      'cancel_pending',
    ].includes(body.status)
  )
    throw new Error('Invalid reservation state');
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE provider_reservations SET external_id=COALESCE(?,external_id),
      status=CASE WHEN status='cancel_pending' AND ? NOT IN ('cancelled','completed','rejected') THEN 'cancel_pending' ELSE ? END,
      body=?,updated_at=? WHERE id=? AND NOT(status='cancelled' AND ?<>'cancelled')
      AND (? IS NULL OR json_extract(body,'$.version') IS NULL OR json_extract(body,'$.version')<=?) AND body<>?`,
    ).bind(
      body.externalId || null,
      body.status,
      body.status,
      JSON.stringify(body),
      now,
      id,
      body.status,
      body.version ?? null,
      body.version ?? null,
      JSON.stringify(body),
    ),
    env.DB.prepare(
      'INSERT INTO provider_history(reservation_id,status,created_at) SELECT id,status,updated_at FROM provider_reservations WHERE id=? AND updated_at=?',
    ).bind(id, now),
  ]);
}
export const transactions = new Hono<AppEnv>();
transactions.use('/offers', identity);
transactions.use('/reservations', identity);
transactions.use('/reservations/*', identity);
transactions.post('/offers', async (c) => {
  const dto = z
    .object({ sourceId: z.string(), query: z.record(z.unknown()) })
    .strict()
    .parse(await c.req.json());
  const s = await configured(c.env, dto.sourceId, 'quote');
  const offers: any[] = [];
  if (s.kind === 'square') {
    const q = quoteInputs.square.parse(dto.query);
    const item = (
      await squareRequest(s, c.env, `/catalog/object/${encodeURIComponent(q.serviceVariationId)}`)
    ).object;
    if (!item?.item_variation_data?.available_for_booking)
      return c.json({ error: 'Service is not bookable' }, 422);
    const money = item.item_variation_data.price_money;
    const unit = money
      ? 10 **
        (new Intl.NumberFormat('en', {
          style: 'currency',
          currency: money.currency,
        }).resolvedOptions().maximumFractionDigits ?? 2)
      : 1;
    const r = await squareRequest(s, c.env, '/bookings/availability/search', {
      query: {
        filter: {
          location_id: s.params.locationId,
          start_at_range: { start_at: q.start, end_at: q.end },
          segment_filters: [{ service_variation_id: q.serviceVariationId }],
        },
      },
    });
    for (const a of r.availabilities || [])
      if (a.location_id === s.params.locationId)
        offers.push({
          title: item.item_variation_data.name,
          amount: money ? money.amount / unit : null,
          currency: money?.currency || null,
          terms: '予約は支払を含みません。取消条件は加盟店へ確認してください。',
          paymentHandledBy: 'provider',
          expiresAt: new Date(Date.now() + 300000).toISOString(),
          providerData: { booking: a },
        });
  } else if (s.kind === 'uber') {
    const q = quoteInputs.uber.parse(dto.query);
    const r = await uberRequest(s, c.env, '/trips/estimates', q);
    for (const e of r.product_estimates || []) {
      const f = e.estimate_info?.fare;
      if (!f?.fare_id || !Number.isFinite(f.value)) continue;
      offers.push({
        title: e.product.display_name,
        amount: f.value,
        currency: f.currency_code,
        terms: JSON.stringify(e.product.cancellation || {}),
        paymentHandledBy: 'provider',
        expiresAt: new Date(f.expires_at * 1000).toISOString(),
        providerData: { ...q, product_id: e.product.product_id, fare_id: f.fare_id },
      });
    }
  }
  if (['viator', 'booking', 'expedia'].includes(s.kind))
    offers.push(
      ...(await merchantQuote(
        s,
        c.env,
        dto.query,
        c.req.header('CF-Connecting-IP') || '127.0.0.1',
      )),
    );
  const publicOffers = [];
  for (const offer of offers) {
    const id = crypto.randomUUID();
    await c.env.DB.prepare('INSERT INTO provider_offers VALUES(?,?,?,?,?,?)')
      .bind(
        id,
        c.get('owner'),
        s.id,
        JSON.stringify(offer),
        offer.expiresAt,
        new Date().toISOString(),
      )
      .run();
    const { providerData, ...visible } = offer;
    publicOffers.push({ id, sourceId: s.id, ...visible });
  }
  return c.json(publicOffers);
});
transactions.use('/offers/*', identity);
transactions.post('/offers/:id/prepare', async (c) => {
  const row = await c.env.DB.prepare('SELECT * FROM provider_offers WHERE id=? AND owner=?')
    .bind(c.req.param('id'), c.get('owner'))
    .first<any>();
  if (!row) return c.json({ error: 'Offer not found' }, 404);
  if (Date.parse(row.expires_at) <= Date.now()) return c.json({ error: 'Offer expired' }, 409);
  const s = await configured(c.env, row.source_id, 'reserve');
  if (s.kind !== 'viator') return c.json({ error: 'Provider preparation unavailable' }, 422);
  let offer = JSON.parse(row.body);
  if (!offer.providerData.hold) {
    if (offer.preparing)
      return c.json(
        { error: 'Hold result is unknown; wait for this offer to expire before searching again' },
        409,
      );
    const updated = await c.env.DB.prepare(
      'UPDATE provider_offers SET body=? WHERE id=? AND body=?',
    )
      .bind(JSON.stringify({ ...offer, preparing: true }), row.id, row.body)
      .run();
    if (!updated.meta.changes) return c.json({ error: 'Preparation already in progress' }, 409);
    offer = await prepareViator(s, c.env, offer, row.id);
    await c.env.DB.prepare('UPDATE provider_offers SET body=?,expires_at=? WHERE id=?')
      .bind(JSON.stringify(offer), offer.expiresAt, row.id)
      .run();
  }
  return c.json({
    id: row.id,
    amount: offer.amount,
    currency: offer.currency,
    terms: offer.terms,
    expiresAt: offer.expiresAt,
    paymentSessionToken: offer.providerData.hold.paymentSessionToken,
  });
});
transactions.get('/reservations', async (c) =>
  c.json(
    (
      await c.env.DB.prepare(
        'SELECT id,source_id,status,body,created_at,updated_at FROM provider_reservations WHERE owner=? ORDER BY created_at DESC',
      )
        .bind(c.get('owner'))
        .all<any>()
    ).results.map((r) => ({ ...r, body: visible({ ...JSON.parse(r.body), status: r.status }) })),
  ),
);
transactions.post('/reservations', async (c) => {
  const dto = z
    .object({ offerId: z.string(), input: z.record(z.unknown()), planId: z.string().optional() })
    .strict()
    .parse(await c.req.json());
  const key = z.string().min(8).max(128).parse(c.req.header('Idempotency-Key'));
  const existing = await c.env.DB.prepare(
    'SELECT * FROM provider_reservations WHERE owner=? AND request_key=?',
  )
    .bind(c.get('owner'), key)
    .first<any>();
  if (existing) {
    if (existing.offer_id !== dto.offerId)
      return c.json({ error: 'Idempotency key belongs to a different offer' }, 409);
    return c.json({ id: existing.id, ...visible(JSON.parse(existing.body)) }, 200);
  }
  const row = await c.env.DB.prepare('SELECT * FROM provider_offers WHERE id=? AND owner=?')
    .bind(dto.offerId, c.get('owner'))
    .first<any>();
  if (!row) return c.json({ error: 'Offer not found' }, 404);
  if (Date.parse(row.expires_at) <= Date.now())
    return c.json({ error: 'Offer expired; search again' }, 409);
  const s = await configured(c.env, row.source_id, 'reserve');
  const input =
    s.kind === 'square'
      ? reserveInputs.square.parse(dto.input)
      : s.kind === 'uber'
        ? reserveInputs.uber.parse(dto.input)
        : merchantInputs[s.kind as keyof typeof merchantInputs].parse(dto.input);
  if (
    dto.planId &&
    !(await c.env.DB.prepare('SELECT id FROM plans WHERE id=? AND owner=?')
      .bind(dto.planId, c.get('owner'))
      .first())
  )
    return c.json({ error: 'Plan not found' }, 404);
  const offer = JSON.parse(row.body);
  if (s.kind === 'viator' && !offer.providerData.hold)
    return c.json({ error: 'Prepare the provider payment form first' }, 409);
  const id = crypto.randomUUID(),
    now = new Date().toISOString();
  const recovery =
    s.kind === 'expedia' ? await encryptTokens(c.env, { email: (input as any).email }) : undefined;
  const initial = {
    externalId: s.kind === 'viator' ? offer.providerData.hold.items[0].bookingRef : undefined,
    recovery,
    status: 'unknown',
    title: offer.title,
    terms: offer.terms,
    planId: dto.planId,
    paymentHandledBy: offer.paymentHandledBy,
    currency: offer.currency,
    customerIp: c.req.header('CF-Connecting-IP') || '127.0.0.1',
  };
  const inserted = await c.env.DB.prepare(
    'INSERT OR IGNORE INTO provider_reservations VALUES(?,?,?,?,?,?,?,?,?,?)',
  )
    .bind(
      id,
      c.get('owner'),
      s.id,
      row.id,
      key,
      initial.externalId || null,
      'unknown',
      JSON.stringify(initial),
      now,
      now,
    )
    .run();
  if (!inserted.meta.changes) {
    const r = await c.env.DB.prepare(
      'SELECT id,body,offer_id,status FROM provider_reservations WHERE owner=? AND request_key=?',
    )
      .bind(c.get('owner'), key)
      .first<any>();
    return r.offer_id === dto.offerId
      ? c.json({ id: r.id, ...visible(JSON.parse(r.body)), status: r.status })
      : c.json({ error: 'Idempotency key conflict' }, 409);
  }
  // Reserve once. An unknown response is never automatically retried, even for providers without idempotency.
  try {
    let state;
    if (['viator', 'booking', 'expedia'].includes(s.kind))
      state = {
        ...initial,
        ...(await merchantReserve(
          s,
          c.env,
          offer,
          input,
          id,
          c.req.header('CF-Connecting-IP') || '127.0.0.1',
        )),
      };
    else {
      let customerId: string | undefined;
      if (s.kind === 'square') {
        const contact = input as z.infer<typeof reserveInputs.square>;
        const customer = await squareRequest(s, c.env, '/customers', {
          idempotency_key: id,
          given_name: contact.firstName,
          family_name: contact.lastName,
          email_address: contact.email,
          phone_number: contact.phone,
        });
        customerId = customer.customer?.id;
        if (!customerId) throw new Error('Square customer creation failed');
      }
      const result =
        s.kind === 'square'
          ? await squareRequest(s, c.env, '/bookings', {
              idempotency_key: id,
              booking: { ...offer.providerData.booking, customer_id: customerId },
            })
          : await uberRequest(s, c.env, '/trips', {
              ...offer.providerData,
              guest: {
                first_name: (input as any).firstName,
                last_name: (input as any).lastName,
                phone_number: (input as any).phone,
                email: (input as any).email,
              },
              call_enabled: true,
            });
      state = { ...initial, ...normalized(s, result) };
    }
    if (!state.externalId) throw new Error('Missing provider identity');
    await recordState(c.env, id, state);
    return c.json({ id, ...visible(state) }, 201);
  } catch (e) {
    const state = {
      ...initial,
      status:
        e instanceof UpstreamError && [400, 401, 403, 422].includes(e.status)
          ? 'rejected'
          : 'unknown',
    };
    await recordState(c.env, id, state);
    return c.json({ id, ...visible(state) }, 202);
  }
});
transactions.get('/reservations/:id', async (c) => {
  const r = await c.env.DB.prepare(
    'SELECT id,body,status FROM provider_reservations WHERE id=? AND owner=?',
  )
    .bind(c.req.param('id'), c.get('owner'))
    .first<any>();
  return r
    ? c.json({ id: r.id, ...visible(JSON.parse(r.body)), status: r.status })
    : c.json({ error: 'Reservation not found' }, 404);
});
export async function refreshReservation(env: Env, r: any) {
  if (!r.external_id && !['unknown'].includes(r.status)) return;
  const s = (await config(env)).sources.find((s) => s.id === r.source_id);
  if (!s?.enabled || !s.operations.includes('lookup')) return;
  if (!r.external_id && !['booking', 'expedia'].includes(s.kind)) return;
  const state = {
    ...JSON.parse(r.body),
    ...(['viator', 'booking', 'expedia'].includes(s.kind)
      ? await merchantLookup(s, env, r)
      : normalized(
          s,
          s.kind === 'square'
            ? await squareRequest(s, env, `/bookings/${encodeURIComponent(r.external_id)}`)
            : await uberRequest(s, env, `/trips/${encodeURIComponent(r.external_id)}`),
        )),
  };
  if (!state.externalId) return;
  if (r.external_id && state.externalId !== r.external_id)
    throw new Error('Provider identity mismatch');
  // A confirmed cancellation cannot be rolled back by a stale response.
  if (r.status === 'cancelled' && state.status !== 'cancelled') return;
  if (
    r.status === 'cancel_pending' &&
    !['cancelled', 'completed', 'rejected'].includes(state.status)
  )
    state.status = 'cancel_pending';
  await recordState(env, r.id, state);
}
transactions.post('/reservations/:id/refresh', async (c) => {
  const r = await c.env.DB.prepare('SELECT * FROM provider_reservations WHERE id=? AND owner=?')
    .bind(c.req.param('id'), c.get('owner'))
    .first<any>();
  if (!r) return c.json({ error: 'Reservation not found' }, 404);
  await refreshReservation(c.env, r);
  return c.json({ ok: true });
});
transactions.get('/reservations/:id/cancellation', async (c) => {
  const r = await c.env.DB.prepare('SELECT * FROM provider_reservations WHERE id=? AND owner=?')
    .bind(c.req.param('id'), c.get('owner'))
    .first<any>();
  if (!r) return c.json({ error: 'Reservation not found' }, 404);
  if (!r.external_id) return c.json({ error: 'Reconcile before cancellation' }, 409);
  const s = await configured(c.env, r.source_id, 'cancel'),
    terms = await cancellationTerms(s, c.env, r),
    digest = await hash(JSON.stringify(terms));
  await c.env.DB.prepare('INSERT OR REPLACE INTO cancellation_quotes VALUES(?,?,?,?,?)')
    .bind(r.id, r.owner, digest, JSON.stringify(terms), Date.now() + 300000)
    .run();
  return c.json({ ...terms, digest });
});
transactions.post('/reservations/:id/cancel', async (c) => {
  const r = await c.env.DB.prepare('SELECT * FROM provider_reservations WHERE id=? AND owner=?')
    .bind(c.req.param('id'), c.get('owner'))
    .first<any>();
  if (!r) return c.json({ error: 'Reservation not found' }, 404);
  if (r.status === 'cancelled') return c.json({ ok: true });
  if (!r.external_id || !['pending', 'confirmed', 'cancel_pending'].includes(r.status))
    return c.json({ error: 'Reconcile the reservation before cancellation' }, 409);
  const s = await configured(c.env, r.source_id, 'cancel');
  let reasonCode: string | undefined;
  if (['viator', 'booking', 'expedia', 'uber'].includes(s.kind)) {
    const dto = z
      .object({ digest: z.string().min(1), reasonCode: z.string().optional() })
      .strict()
      .parse(await c.req.json());
    const terms = await c.env.DB.prepare(
      'SELECT * FROM cancellation_quotes WHERE reservation_id=? AND owner=? AND expires_at>?',
    )
      .bind(r.id, r.owner, Date.now())
      .first<any>();
    if (!terms || terms.digest !== dto.digest)
      return c.json({ error: 'Confirm current cancellation terms' }, 409);
    if (s.kind === 'viator') {
      if (
        !JSON.parse(terms.body).reasons?.some(
          (r: any) => r.cancellationReasonCode === dto.reasonCode,
        )
      )
        return c.json({ error: 'Select a provider cancellation reason' }, 400);
      reasonCode = dto.reasonCode;
    }
  }
  await c.env.DB.prepare(
    "UPDATE provider_operations SET status='pending',next_attempt=?,body=? WHERE reservation_id=? AND status='review-required'",
  )
    .bind(
      new Date().toISOString(),
      JSON.stringify({ version: JSON.parse(r.body).version, reasonCode }),
      r.id,
    )
    .run();
  await c.env.DB.batch([
    c.env.DB.prepare(
      "INSERT OR IGNORE INTO provider_operations VALUES(?,?,?,'pending',0,?,?)",
    ).bind(
      crypto.randomUUID(),
      r.id,
      'cancel',
      new Date().toISOString(),
      JSON.stringify({ version: JSON.parse(r.body).version, reasonCode }),
    ),
    c.env.DB.prepare(
      "UPDATE provider_reservations SET status='cancel_pending' WHERE id=? AND status IN ('pending','confirmed')",
    ).bind(r.id),
  ]);
  await recoverReservations(c.env);
  return c.json({ status: 'cancel_pending' }, 202);
});
export async function recoverReservations(env: Env) {
  const rows = (
    await env.DB.prepare(
      "SELECT * FROM provider_reservations WHERE status IN ('unknown','pending','confirmed','cancel_pending') ORDER BY updated_at ASC LIMIT 50",
    ).all<any>()
  ).results;
  for (const r of rows) {
    try {
      await refreshReservation(env, r);
    } catch {
      console.error(JSON.stringify({ event: 'reservation_lookup_failed', id: r.id }));
    } finally {
      await env.DB.prepare('UPDATE provider_reservations SET updated_at=? WHERE id=?')
        .bind(new Date().toISOString(), r.id)
        .run();
    }
  }
  const jobs = (
    await env.DB.prepare(
      "SELECT * FROM provider_operations WHERE status='pending' AND next_attempt<=? LIMIT 25",
    )
      .bind(new Date().toISOString())
      .all<any>()
  ).results;
  for (const job of jobs) {
    const lease = await env.DB.prepare(
      "UPDATE provider_operations SET next_attempt=?,attempts=attempts+1 WHERE id=? AND next_attempt<=? AND status='pending'",
    )
      .bind(new Date(Date.now() + 300000).toISOString(), job.id, new Date().toISOString())
      .run();
    if (!lease.meta.changes) continue;
    try {
      const r = await env.DB.prepare('SELECT * FROM provider_reservations WHERE id=?')
        .bind(job.reservation_id)
        .first<any>();
      if (r.status === 'cancelled') {
        await env.DB.prepare("UPDATE provider_operations SET status='done' WHERE id=?")
          .bind(job.id)
          .run();
        continue;
      }
      const s = await configured(env, r.source_id, 'cancel');
      if (s.kind === 'viator') {
        const approved = await env.DB.prepare(
          'SELECT digest FROM cancellation_quotes WHERE reservation_id=?',
        )
          .bind(r.id)
          .first<any>();
        const actual = await cancellationTerms(s, env, r);
        if (!approved || approved.digest !== (await hash(JSON.stringify(actual)))) {
          await env.DB.prepare("UPDATE provider_operations SET status='review-required' WHERE id=?")
            .bind(job.id)
            .run();
          continue;
        }
      }
      if (['viator', 'booking', 'expedia'].includes(s.kind)) {
        await recordState(env, r.id, {
          ...JSON.parse(r.body),
          ...(await merchantCancel(s, env, r, JSON.parse(job.body).reasonCode)),
        });
      } else {
        const result =
          s.kind === 'square'
            ? await squareRequest(s, env, `/bookings/${encodeURIComponent(r.external_id)}/cancel`, {
                idempotency_key: job.id,
                booking_version: JSON.parse(r.body).version,
              })
            : await uberRequest(
                s,
                env,
                `/trips/${encodeURIComponent(r.external_id)}`,
                undefined,
                'DELETE',
              );
        if (s.kind === 'square')
          await recordState(env, r.id, { ...JSON.parse(r.body), ...normalized(s, result) });
        else await refreshReservation(env, r);
      }
      const final = await env.DB.prepare('SELECT status FROM provider_reservations WHERE id=?')
        .bind(r.id)
        .first<any>();
      if (final.status === 'cancelled')
        await env.DB.prepare("UPDATE provider_operations SET status='done' WHERE id=?")
          .bind(job.id)
          .run();
    } catch {
      console.error(
        JSON.stringify({ event: 'reservation_cancel_pending', id: job.reservation_id }),
      );
    }
  }
}
