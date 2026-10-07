import { Hono } from 'hono';
import { config } from './store';
import { hash, type AppEnv } from './auth';
import { secret, type Env } from './model';
import { refreshReservation } from './transactions';
export async function verifyProviderSignature(
  kind: string,
  raw: string,
  signature: string,
  signingKey: string,
  url: string,
) {
  try {
    const expected =
      kind === 'square'
        ? Uint8Array.from(atob(signature), (c) => c.charCodeAt(0))
        : Uint8Array.from(signature.match(/.{2}/g) || [], (v) => parseInt(v, 16));
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(signingKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    return await crypto.subtle.verify(
      'HMAC',
      key,
      expected,
      new TextEncoder().encode(kind === 'square' ? url + raw : raw),
    );
  } catch {
    return false;
  }
}
export const providerWebhooks = new Hono<AppEnv>();
providerWebhooks.post('/webhooks/providers/:id', async (c) => {
  const s = (await config(c.env)).sources.find((s) => s.id === c.req.param('id') && s.enabled);
  if (!s || !['square', 'uber'].includes(s.kind))
    return c.json({ error: 'Webhook connection unavailable' }, 404);
  const raw = await c.req.text(),
    url = c.env.API_ORIGIN + '/api/v1/webhooks/providers/' + s.id,
    signature =
      c.req.header(s.kind === 'square' ? 'x-square-hmacsha256-signature' : 'x-uber-signature') ||
      '';
  let signingKey: string;
  try {
    signingKey = secret(c.env, s.secretRef + '_WEBHOOK');
  } catch {
    return c.json({ error: 'Webhook not configured' }, 503);
  }
  if (!(await verifyProviderSignature(s.kind, raw, signature, signingKey, url)))
    return c.json({ error: 'Invalid webhook signature' }, 403);
  const body = JSON.parse(raw),
    externalId = s.kind === 'square' ? body.data?.object?.booking?.id : body.meta?.resource_id;
  const row = await c.env.DB.prepare(
    'SELECT * FROM provider_reservations WHERE source_id=? AND external_id=?',
  )
    .bind(s.id, externalId || '')
    .first<any>();
  if (!row) return c.json({ ok: true });
  const id = s.id + ':' + (body.event_id || (await hash(raw)));
  await c.env.DB.prepare('INSERT OR IGNORE INTO provider_notifications VALUES(?,?,?,0,?)')
    .bind(id, s.id, row.id, new Date().toISOString())
    .run();
  // Never apply provider payload state directly. A signed event triggers an authoritative lookup.
  const event = await c.env.DB.prepare('SELECT processed FROM provider_notifications WHERE id=?')
    .bind(id)
    .first<any>();
  if (!event.processed) {
    await refreshReservation(c.env, row);
    await c.env.DB.prepare('UPDATE provider_notifications SET processed=1 WHERE id=?')
      .bind(id)
      .run();
  }
  return c.json({ ok: true });
});
export async function recoverNotifications(env: Env) {
  const events = (
    await env.DB.prepare(
      'SELECT * FROM provider_notifications WHERE processed=0 LIMIT 50',
    ).all<any>()
  ).results;
  for (const event of events) {
    try {
      const row = await env.DB.prepare('SELECT * FROM provider_reservations WHERE id=?')
        .bind(event.reservation_id)
        .first<any>();
      if (row) {
        await refreshReservation(env, row);
        await env.DB.prepare('UPDATE provider_notifications SET processed=1 WHERE id=?')
          .bind(event.id)
          .run();
      }
    } catch {
      console.error(JSON.stringify({ event: 'provider_notification_pending', id: event.id }));
    }
  }
}
