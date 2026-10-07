import { Hono } from 'hono';
import { z } from 'zod';
import { identity, hash, type AppEnv } from './auth';
import type { Env } from './model';
import { secret } from './model';
import { config, audit } from './store';
import { request } from './http';
const now = () => new Date().toISOString();
async function hmac(key: string, body: string) {
  const k = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return Array.from(
    new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(body))),
    (x) => x.toString(16).padStart(2, '0'),
  ).join('');
}
function equal(a: string, b: string) {
  if (a.length !== b.length) return false;
  let v = 0;
  for (let i = 0; i < a.length; i++) v |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return v === 0;
}
export async function verifyStripe(
  body: string,
  signature: string,
  key: string,
  time = Date.now(),
) {
  const parts = signature.split(',');
  const t = parts.find((s) => s.startsWith('t='))?.slice(2);
  if (!t || !Number.isFinite(Number(t)) || Math.abs(time / 1000 - Number(t)) > 300)
    throw new Error('Invalid webhook timestamp');
  const digest = await hmac(key, `${t}.${body}`);
  if (!parts.filter((s) => s.startsWith('v1=')).some((s) => equal(s.slice(3), digest)))
    throw new Error('Invalid webhook signature');
}
async function ticketToken(env: Env, id: string) {
  return hmac(secret(env, 'TICKET_SECRET'), id);
}
export async function stripe(env: Env, path: string, body?: URLSearchParams, key?: string) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${secret(env, 'STRIPE_SECRET_KEY')}`,
    'Stripe-Version': '2025-03-31.basil',
  };
  if (body) headers['Content-Type'] = 'application/x-www-form-urlencoded';
  if (key) headers['Idempotency-Key'] = key;
  const r = await request(`https://api.stripe.com/v1/${path}`, {
    method: body ? 'POST' : 'GET',
    headers,
    body,
  });
  return r.json() as Promise<any>;
}
export const commerce = new Hono<AppEnv>();
commerce.get('/products', async (c) => {
  const cfg = await config(c.env);
  return c.json(cfg.features.commerce ? cfg.products.filter((p) => p.enabled) : []);
});
commerce.use('/orders/*', identity);
commerce.use('/orders', identity);
commerce.post('/orders', async (c) => {
  const cfg = await config(c.env);
  if (!cfg.features.commerce) return c.json({ error: 'Commerce is disabled' }, 404);
  const dto = z
    .object({ productId: z.string() })
    .strict()
    .parse(await c.req.json());
  const key = z.string().min(8).max(200).parse(c.req.header('Idempotency-Key'));
  const product = cfg.products.find((p) => p.id === dto.productId && p.enabled);
  if (!product) return c.json({ error: 'Unknown product' }, 404);
  const owner = c.get('owner');
  let row = await c.env.DB.prepare('SELECT * FROM orders WHERE owner=? AND request_key=?')
    .bind(owner, key)
    .first<any>();
  if (row && row.product_id !== product.id)
    return c.json({ error: 'Idempotency key belongs to a different product' }, 409);
  if (!row) {
    const id = crypto.randomUUID();
    const tokenHash = await hash(await ticketToken(c.env, id));
    await c.env.DB.prepare(
      "INSERT OR IGNORE INTO orders(id,owner,request_key,product_id,amount,currency,product,status,ticket_token,expires_at,created_at,updated_at) VALUES(?,?,?,?,?,'JPY',?,'pending',?,?,?,?)",
    )
      .bind(
        id,
        owner,
        key,
        product.id,
        product.amount,
        JSON.stringify(product),
        tokenHash,
        new Date(Date.now() + product.validHours * 3600000).toISOString(),
        now(),
        now(),
      )
      .run();
    row = await c.env.DB.prepare('SELECT * FROM orders WHERE owner=? AND request_key=?')
      .bind(owner, key)
      .first<any>();
  }
  if (!row.checkout_id) {
    if (Date.now() - Date.parse(row.created_at) > 23 * 3600000)
      return c.json(
        {
          error:
            'Checkout response is unresolved beyond the safe retry window. Ask the administrator to reconcile with Stripe.',
        },
        409,
      );
    const body = new URLSearchParams({
      mode: 'payment',
      'line_items[0][price_data][currency]': 'jpy',
      'line_items[0][price_data][unit_amount]': String(row.amount),
      'line_items[0][price_data][product_data][name]': JSON.parse(row.product).title,
      'line_items[0][quantity]': '1',
      'metadata[orderId]': row.id,
      client_reference_id: row.id,
      success_url: `${c.env.APP_ORIGIN}/my-plans?order=${row.id}`,
      cancel_url: `${c.env.APP_ORIGIN}/my-plans?order=${row.id}`,
    });
    const s = await stripe(c.env, 'checkout/sessions', body, `checkout:${row.id}`);
    await c.env.DB.prepare('UPDATE orders SET checkout_id=?,checkout_url=?,updated_at=? WHERE id=?')
      .bind(s.id, s.url, now(), row.id)
      .run();
    row.checkout_id = s.id;
    row.checkout_url = s.url;
  }
  return c.json({ id: row.id, status: row.status, checkoutUrl: row.checkout_url }, 201);
});
commerce.get('/tickets', identity, async (c) => {
  const rows = await c.env.DB.prepare(
    "SELECT id,product,status,expires_at FROM orders WHERE owner=? AND status<>'pending' ORDER BY created_at DESC",
  )
    .bind(c.get('owner'))
    .all<any>();
  return c.json(
    await Promise.all(
      rows.results.map(async (r) => ({
        id: r.id,
        orderId: r.id,
        title: JSON.parse(r.product).title,
        reference: true,
        status:
          r.status === 'paid'
            ? Date.parse(r.expires_at) > Date.now()
              ? 'valid'
              : 'expired'
            : r.status,
        expiresAt: r.expires_at,
        ...(r.status === 'paid' && Date.parse(r.expires_at) > Date.now()
          ? { token: await ticketToken(c.env, r.id) }
          : {}),
      })),
    ),
  );
});
commerce.get('/orders', async (c) => {
  const r = await c.env.DB.prepare(
    'SELECT id,product,amount,currency,status,expires_at,created_at,checkout_url FROM orders WHERE owner=? ORDER BY created_at DESC',
  )
    .bind(c.get('owner'))
    .all();
  return c.json(
    r.results.map((r: any) => ({
      ...r,
      product: JSON.parse(r.product),
      status: r.status === 'paid' && Date.parse(r.expires_at) <= Date.now() ? 'expired' : r.status,
    })),
  );
});
commerce.get('/orders/:id', async (c) => {
  const row = await c.env.DB.prepare('SELECT * FROM orders WHERE id=? AND owner=?')
    .bind(c.req.param('id'), c.get('owner'))
    .first<any>();
  if (!row) return c.json({ error: 'Order not found' }, 404);
  if (row.status === 'pending' && row.checkout_id) await reconcile(c.env, row);
  const updated = await c.env.DB.prepare('SELECT * FROM orders WHERE id=?')
    .bind(row.id)
    .first<any>();
  return c.json({
    id: row.id,
    product: JSON.parse(row.product),
    amount: row.amount,
    currency: row.currency,
    status:
      updated.status === 'paid' && Date.parse(row.expires_at) <= Date.now()
        ? 'expired'
        : updated.status,
    expiresAt: row.expires_at,
    checkoutUrl: row.checkout_url,
    ticket:
      updated.status === 'paid' && Date.parse(row.expires_at) > Date.now()
        ? { token: await ticketToken(c.env, row.id), reference: true }
        : null,
  });
});
commerce.post('/orders/:id/refunds', async (c) => {
  const row = await c.env.DB.prepare('SELECT * FROM orders WHERE id=? AND owner=?')
    .bind(c.req.param('id'), c.get('owner'))
    .first<any>();
  if (!row) return c.json({ error: 'Order not found' }, 404);
  if (row.status === 'refund_pending' || row.status === 'refunded')
    return c.json({ status: row.status });
  const results = await c.env.DB.batch([
    c.env.DB.prepare(
      "UPDATE orders SET status='refund_pending',updated_at=? WHERE id=? AND status='paid' AND expires_at>?",
    ).bind(now(), row.id, now()),
    c.env.DB.prepare(
      "INSERT OR IGNORE INTO jobs(id,order_id,kind,status,next_attempt) SELECT ?,id,'refund','pending',? FROM orders WHERE id=? AND status='refund_pending'",
    ).bind(`refund:${row.id}`, now(), row.id),
  ]);
  if (!results[0].meta.changes)
    return c.json({ error: 'Only unused, valid tickets can be refunded' }, 409);
  await audit(c.env, c.get('owner'), 'refund_requested', row.id);
  return c.json({ status: 'refund_pending' }, 202);
});
commerce.post('/tickets/validate', identity, async (c) => {
  const cfg = await config(c.env),
    owner = c.get('owner');
  if (!cfg.admins.includes(owner) && !cfg.validators.includes(owner))
    return c.json({ error: 'Validator permission required' }, 403);
  const dto = z
    .object({ token: z.string().regex(/^[a-f0-9]{64}$/) })
    .strict()
    .parse(await c.req.json());
  const row = await c.env.DB.prepare(
    "UPDATE orders SET status='used',updated_at=? WHERE ticket_token=? AND status='paid' AND expires_at>? RETURNING id",
  )
    .bind(now(), await hash(dto.token), now())
    .first<{ id: string }>();
  if (!row)
    return c.json({ valid: false, message: '券が無効、使用済み、または取消処理中です' }, 409);
  await audit(c.env, owner, 'ticket_used', row.id);
  return c.json({ valid: true, id: row.id });
});
commerce.post('/webhooks/stripe', async (c) => {
  const body = await c.req.text();
  await verifyStripe(
    body,
    c.req.header('stripe-signature') || '',
    secret(c.env, 'STRIPE_WEBHOOK_SECRET'),
  );
  const event = JSON.parse(body);
  await c.env.DB.prepare('INSERT OR IGNORE INTO webhook_events VALUES(?,?,?,0,?)')
    .bind(event.id, event.type, body, now())
    .run();
  await processEvent(c.env, event);
  await c.env.DB.prepare('UPDATE webhook_events SET processed=1 WHERE id=?').bind(event.id).run();
  return c.json({ received: true });
});
export async function fulfill(env: Env, session: any) {
  const id = session.metadata?.orderId;
  if (!id) return;
  const row = await env.DB.prepare('SELECT * FROM orders WHERE id=?').bind(id).first<any>();
  if (!row) return;
  if (row.checkout_id && row.checkout_id !== session.id)
    throw new Error('Checkout does not match order');
  if (session.amount_total !== row.amount || session.currency !== 'jpy')
    throw new Error('Payment does not match order');
  if (session.status === 'expired' && session.payment_status !== 'paid')
    await env.DB.prepare(
      "UPDATE orders SET status='expired',updated_at=? WHERE id=? AND status='pending'",
    )
      .bind(now(), id)
      .run();
  if (session.payment_status === 'paid')
    await env.DB.prepare(
      "UPDATE orders SET status='paid',payment_id=?,checkout_id=COALESCE(checkout_id,?),updated_at=? WHERE id=? AND status='pending'",
    )
      .bind(session.payment_intent, session.id, now(), id)
      .run();
}
async function processEvent(env: Env, e: any) {
  if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(e.type))
    await fulfill(
      env,
      await stripe(env, `checkout/sessions/${encodeURIComponent(e.data.object.id)}`),
    );
  if (e.type === 'checkout.session.expired')
    await env.DB.prepare(
      "UPDATE orders SET status='expired',updated_at=? WHERE checkout_id=? AND status='pending'",
    )
      .bind(now(), e.data.object.id)
      .run();
}
async function reconcile(env: Env, row: any) {
  await fulfill(env, await stripe(env, `checkout/sessions/${encodeURIComponent(row.checkout_id)}`));
}
export async function recoverCommerce(env: Env) {
  if (!env.STRIPE_SECRET_KEY) return;
  const pendingEvents = await env.DB.prepare(
    'SELECT body,id FROM webhook_events WHERE processed=0 LIMIT 20',
  ).all<{ body: string; id: string }>();
  for (const e of pendingEvents.results) {
    try {
      await processEvent(env, JSON.parse(e.body));
      await env.DB.prepare('UPDATE webhook_events SET processed=1 WHERE id=?').bind(e.id).run();
    } catch {
      console.error(JSON.stringify({ event: 'webhook_recovery_failed', id: e.id }));
    }
  }
  const orders = await env.DB.prepare(
    "SELECT * FROM orders WHERE status='pending' AND checkout_id IS NOT NULL ORDER BY updated_at LIMIT 20",
  ).all<any>();
  for (const row of orders.results) {
    try {
      await reconcile(env, row);
    } catch {
      console.error(JSON.stringify({ event: 'payment_reconciliation_failed', id: row.id }));
    }
  }
  const jobs = await env.DB.prepare(
    "SELECT * FROM jobs WHERE status IN ('pending','running') AND next_attempt<=? LIMIT 20",
  )
    .bind(now())
    .all<any>();
  for (const job of jobs.results) {
    const lease = await env.DB.prepare(
      "UPDATE jobs SET status='running',next_attempt=? WHERE id=? AND next_attempt<=? AND status IN ('pending','running')",
    )
      .bind(new Date(Date.now() + 120000).toISOString(), job.id, now())
      .run();
    if (!lease.meta.changes) continue;
    try {
      const row = await env.DB.prepare('SELECT * FROM orders WHERE id=?')
        .bind(job.order_id)
        .first<any>();
      if (!row?.payment_id) throw new Error('Payment reference is not ready');
      const refund = await stripe(
        env,
        'refunds',
        new URLSearchParams({ payment_intent: row.payment_id, amount: String(row.amount) }),
        job.id,
      );
      if (refund.status !== 'succeeded') throw new Error('Refund is awaiting confirmation');
      await env.DB.batch([
        env.DB.prepare(
          "UPDATE orders SET status='refunded',updated_at=? WHERE id=? AND status='refund_pending'",
        ).bind(now(), row.id),
        env.DB.prepare("UPDATE jobs SET status='done',error=NULL WHERE id=?").bind(job.id),
      ]);
    } catch {
      await env.DB.prepare(
        "UPDATE jobs SET status='pending',attempts=attempts+1,next_attempt=?,error='Refund needs rechecking' WHERE id=?",
      )
        .bind(
          new Date(
            Date.now() + Math.min(3600, 60 * 2 ** Math.min(job.attempts, 6)) * 1000,
          ).toISOString(),
          job.id,
        )
        .run();
    }
  }
}
