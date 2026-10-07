import { Hono } from 'hono';
import { z } from 'zod';
import { identity, hash, type AppEnv } from './auth';
import { config, records } from './store';
import { secret, type Env } from './model';
import { json, request } from './http';
function encode(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}
import { encryptTokens, decryptTokens, tokenKey as key } from './tokens';
export { encryptTokens, decryptTokens } from './tokens';
async function source(env: Env, id: string) {
  const s = (await config(env)).sources.find(
    (s) =>
      s.id === id &&
      s.kind === 'google-calendar' &&
      s.enabled &&
      s.operations.includes('calendar-write'),
  );
  if (!s) throw new Error('Calendar connection disabled');
  return s;
}
async function token(env: Env, id: string, owner: string) {
  const s = await source(env, id);
  const row = await env.DB.prepare(
    'SELECT encrypted FROM oauth_connections WHERE source_id=? AND owner=?',
  )
    .bind(id, owner)
    .first<{ encrypted: string }>();
  if (!row) throw new Error('Connect Google Calendar first');
  let t = await decryptTokens(env, row.encrypted);
  if (t.expiresAt < Date.now() + 60000) {
    const r = await json('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: s.params.clientId,
        client_secret: secret(env, s.secretRef),
        grant_type: 'refresh_token',
        refresh_token: t.refresh_token,
      }).toString(),
    });
    if (!r.access_token) throw new Error('Calendar authorization expired');
    t = { ...t, ...r, expiresAt: Date.now() + r.expires_in * 1000 };
    await env.DB.prepare(
      'UPDATE oauth_connections SET encrypted=?,updated_at=? WHERE source_id=? AND owner=?',
    )
      .bind(await encryptTokens(env, t), new Date().toISOString(), id, owner)
      .run();
  }
  return t.access_token;
}
export const googleCalendar = new Hono<AppEnv>();
googleCalendar.use('/integrations/*', identity);
googleCalendar.get('/integrations/:id/google/authorize', async (c) => {
  const s = await source(c.env, c.req.param('id'));
  await key(c.env);
  const state = crypto.randomUUID(),
    verifier = encode(crypto.getRandomValues(new Uint8Array(32))),
    challenge = encode(
      new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))),
    );
  await c.env.DB.prepare('INSERT INTO oauth_states VALUES(?,?,?,?,?)')
    .bind(await hash(state), s.id, c.get('owner'), verifier, Date.now() + 600000)
    .run();
  const u = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  for (const [k, v] of Object.entries({
    client_id: s.params.clientId,
    redirect_uri: c.env.API_ORIGIN + '/api/v1/integrations/google/callback',
    response_type: 'code',
    scope:
      'https://www.googleapis.com/auth/calendar.events.owned https://www.googleapis.com/auth/calendar.calendarlist.readonly',
    access_type: 'offline',
    prompt: 'consent',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  }))
    u.searchParams.set(k, v);
  return c.redirect(u.toString());
});
googleCalendar.get('/integrations/google/callback', async (c) => {
  const state = c.req.query('state');
  if (!state) return c.json({ error: 'Missing OAuth state' }, 400);
  const row = await c.env.DB.prepare(
    'DELETE FROM oauth_states WHERE id=? AND owner=? AND expires_at>? RETURNING *',
  )
    .bind(await hash(state), c.get('owner'), Date.now())
    .first<any>();
  if (!row) return c.json({ error: 'Invalid or expired authorization' }, 400);
  if (c.req.query('error')) return c.redirect(c.env.APP_ORIGIN + '/my-plans?calendar=denied');
  const s = await source(c.env, row.source_id),
    code = z.string().min(1).parse(c.req.query('code'));
  const t = await json('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: s.params.clientId,
      client_secret: secret(c.env, s.secretRef),
      redirect_uri: c.env.API_ORIGIN + '/api/v1/integrations/google/callback',
      grant_type: 'authorization_code',
      code_verifier: row.verifier,
    }).toString(),
  });
  if (!t.refresh_token || !t.access_token)
    throw new Error('Offline Calendar authorization required');
  await c.env.DB.prepare('INSERT OR REPLACE INTO oauth_connections VALUES(?,?,?,?)')
    .bind(
      s.id,
      c.get('owner'),
      await encryptTokens(c.env, { ...t, expiresAt: Date.now() + t.expires_in * 1000 }),
      new Date().toISOString(),
    )
    .run();
  return c.redirect(c.env.APP_ORIGIN + '/my-plans?calendar=connected');
});
googleCalendar.get('/integrations/:id/google/calendars', async (c) => {
  const access = await token(c.env, c.req.param('id'), c.get('owner'));
  let next: string | undefined;
  const rows: any[] = [];
  do {
    const u = new URL('https://www.googleapis.com/calendar/v3/users/me/calendarList');
    u.searchParams.set('minAccessRole', 'owner');
    if (next) u.searchParams.set('pageToken', next);
    const r = await json(u, { headers: { Authorization: `Bearer ${access}` } });
    rows.push(
      ...r.items.map((i: any) => ({ id: i.id, summary: i.summary, accessRole: i.accessRole })),
    );
    next = r.nextPageToken;
  } while (next);
  return c.json(rows);
});
googleCalendar.post('/integrations/:id/google/plans/:planId', async (c) => {
  const id = c.req.param('id'),
    owner = c.get('owner'),
    planId = c.req.param('planId');
  const { calendarId } = z
    .object({ calendarId: z.string().min(1) })
    .strict()
    .parse(await c.req.json());
  const row = await c.env.DB.prepare('SELECT body FROM plans WHERE id=? AND owner=?')
    .bind(planId, owner)
    .first<{ body: string }>();
  if (!row) return c.json({ error: 'Plan not found' }, 404);
  const access = await token(c.env, id, owner),
    headers = { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' };
  const cal = await json(
    `https://www.googleapis.com/calendar/v3/users/me/calendarList/${encodeURIComponent(calendarId)}`,
    { headers },
  );
  if (cal.accessRole !== 'owner') return c.json({ error: 'Choose a calendar you own' }, 403);
  const plan = JSON.parse(row.body);
  const current = await records(c.env, 'activity');
  plan.items = plan.items.map((i: any) => {
    const a = current.find((a) => a.id === i.referenceId);
    return a ? { ...i, start: a.start, end: a.end, cancelled: a.status === 'cancelled' } : i;
  });
  const starts = plan.items
      .map((i: any) => i.start || i.snapshot?.start)
      .filter(Boolean)
      .sort((a: string, b: string) => Date.parse(a) - Date.parse(b)),
    ends = plan.items
      .map((i: any) => i.end || i.snapshot?.end || i.start || i.snapshot?.start)
      .filter(Boolean)
      .sort((a: string, b: string) => Date.parse(a) - Date.parse(b));
  const windows = plan.items
    .map((i: any) => i.bookingWindow || i.snapshot?.bookingWindow)
    .filter(Boolean);
  if (!starts.length && !windows.length)
    return c.json({ error: 'Plan requires dates; use ICS for undated plans' }, 422);
  if (starts.length && Date.parse(ends.at(-1)) <= Date.parse(starts[0]))
    return c.json(
      { error: 'Calendar export requires an end time. Add a dated return journey or use ICS.' },
      422,
    );
  const span = starts.length
    ? { start: { dateTime: starts[0] }, end: { dateTime: ends.at(-1) } }
    : {
        start: { date: windows.map((w: any) => w.checkinDate).sort()[0] },
        end: {
          date: windows
            .map((w: any) => w.checkoutDate)
            .sort()
            .at(-1),
        },
      };
  const eventId = 'om' + (await hash(planId + '|' + id + '|' + calendarId)).slice(0, 40);
  const link = await c.env.DB.prepare(
    'SELECT * FROM calendar_links WHERE plan_id=? AND source_id=? AND calendar_id=? AND owner=?',
  )
    .bind(planId, id, calendarId, owner)
    .first<any>();
  const body = {
    summary: plan.title,
    description: plan.items
      .map(
        (i: any) =>
          `${i.title} — ${i.cancelled ? '活動中止' : '保存した予定（予約状態はOpenMaaSで確認）'}`,
      )
      .join('\n'),
    ...span,
    status: 'tentative',
    extendedProperties: { private: { openmaasPlanId: planId } },
  };
  const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
  let result;
  try {
    result = await json(link ? `${base}/${eventId}` : base, {
      method: link ? 'PUT' : 'POST',
      headers: { ...headers, ...(link?.etag ? { 'If-Match': link.etag } : {}) },
      body: JSON.stringify(link ? body : { id: eventId, ...body }),
    });
  } catch (e) {
    if ((e as any).status === 409 && !link) {
      const existing = await json(`${base}/${eventId}`, { headers });
      if (existing.extendedProperties?.private?.openmaasPlanId !== planId) throw e;
      result = existing;
    } else throw e;
  }
  await c.env.DB.prepare('INSERT OR REPLACE INTO calendar_links VALUES(?,?,?,?,?,?)')
    .bind(planId, owner, id, calendarId, eventId, result.etag || null)
    .run();
  return c.json({ eventId, url: result.htmlLink });
});
googleCalendar.delete('/integrations/:id/google', async (c) => {
  const id = c.req.param('id'),
    owner = c.get('owner');
  const row = await c.env.DB.prepare(
    'SELECT encrypted FROM oauth_connections WHERE source_id=? AND owner=?',
  )
    .bind(id, owner)
    .first<{ encrypted: string }>();
  if (row) {
    const t = await decryptTokens(c.env, row.encrypted);
    await request('https://oauth2.googleapis.com/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: t.refresh_token }).toString(),
    });
  }
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM oauth_connections WHERE source_id=? AND owner=?').bind(id, owner),
    c.env.DB.prepare('DELETE FROM calendar_links WHERE source_id=? AND owner=?').bind(id, owner),
  ]);
  return c.json({ ok: true, calendarEventsRetained: true });
});
