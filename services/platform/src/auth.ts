import { boundedBody } from './http';
import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { config } from './store';
import { secret, safeLink, type Env } from './model';
import { json, request } from './http';
export type AppEnv = { Bindings: Env; Variables: { owner: string; name: string } };
export function randomToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (x) =>
    x.toString(16).padStart(2, '0'),
  ).join('');
}
export async function hash(v: string) {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v))),
    (x) => x.toString(16).padStart(2, '0'),
  ).join('');
}
function base64url(b: Uint8Array) {
  return btoa(String.fromCharCode(...b))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}
async function discover(issuer: string) {
  const d = await json(`${issuer.replace(/\/$/, '')}/.well-known/openid-configuration`);
  if (
    d.issuer !== issuer ||
    !['authorization_endpoint', 'token_endpoint', 'jwks_uri'].every((k) => safeLink(d[k]))
  )
    throw new Error('Invalid OIDC discovery');
  return d;
}
export const auth = new Hono<AppEnv>();
auth.get('/login', async (c) => {
  const cfg = await config(c.env);
  if (!cfg.oidc) return c.json({ error: 'OIDC is not configured' }, 503);
  const discovery = await discover(cfg.oidc.issuer);
  const state = randomToken(),
    verifier = randomToken(),
    nonce = randomToken();
  await c.env.DB.prepare('INSERT INTO oidc_pending VALUES(?,?,?,?)')
    .bind(await hash(state), verifier, nonce, Date.now() + 600000)
    .run();
  setCookie(c, 'openmaas_login', state, {
    httpOnly: true,
    secure: c.env.API_ORIGIN.startsWith('https:'),
    sameSite: 'Lax',
    path: '/api/v1/auth',
    maxAge: 600,
  });
  const u = new URL(discovery.authorization_endpoint);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('client_id', cfg.oidc.clientId);
  u.searchParams.set('redirect_uri', `${c.env.API_ORIGIN}/api/v1/auth/callback`);
  u.searchParams.set('scope', 'openid profile');
  u.searchParams.set('state', state);
  u.searchParams.set('nonce', nonce);
  u.searchParams.set('code_challenge_method', 'S256');
  u.searchParams.set(
    'code_challenge',
    base64url(
      new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))),
    ),
  );
  return c.redirect(u.toString());
});
auth.get('/callback', async (c) => {
  const state = c.req.query('state'),
    code = c.req.query('code');
  if (!state || !code || getCookie(c, 'openmaas_login') !== state)
    return c.json({ error: 'Invalid login state' }, 400);
  const pending = await c.env.DB.prepare(
    'DELETE FROM oidc_pending WHERE id=? AND expires_at>? RETURNING *',
  )
    .bind(await hash(state), Date.now())
    .first<{ verifier: string; nonce: string }>();
  if (!pending) return c.json({ error: 'Expired login' }, 400);
  deleteCookie(c, 'openmaas_login', { path: '/api/v1/auth' });
  const cfg = await config(c.env);
  const oidc = cfg.oidc!;
  const d = await discover(oidc.issuer);
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: oidc.clientId,
    redirect_uri: `${c.env.API_ORIGIN}/api/v1/auth/callback`,
    code_verifier: pending.verifier,
  });
  if (oidc.clientSecretRef) body.set('client_secret', secret(c.env, oidc.clientSecretRef));
  const r = await request(d.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const tokens = JSON.parse(new TextDecoder().decode(await boundedBody(r))) as { id_token: string };
  const { payload } = await jwtVerify(tokens.id_token, createRemoteJWKSet(new URL(d.jwks_uri)), {
    issuer: oidc.issuer,
    audience: oidc.clientId,
  });
  if (payload.nonce !== pending.nonce || !payload.sub || !Number.isFinite(payload.exp))
    throw new Error('Invalid identity token');
  const session = randomToken();
  await c.env.DB.prepare('INSERT INTO sessions VALUES(?,?,?,?)')
    .bind(
      await hash(session),
      `${oidc.issuer}|${payload.sub}`,
      String(payload.name || payload.sub),
      Math.min(Date.now() + 86400000, Number(payload.exp) * 1000),
    )
    .run();
  setCookie(c, 'openmaas_session', session, {
    httpOnly: true,
    secure: c.env.API_ORIGIN.startsWith('https:'),
    sameSite: 'Lax',
    path: '/',
    maxAge: 86400,
  });
  return c.redirect(`${c.env.APP_ORIGIN}/explore`);
});
auth.get('/session', async (c) => {
  const token = getCookie(c, 'openmaas_session');
  const s = token
    ? await c.env.DB.prepare('SELECT owner,name FROM sessions WHERE id=? AND expires_at>?')
        .bind(await hash(token), Date.now())
        .first<{ owner: string; name: string }>()
    : null;
  const cfg = await config(c.env);
  return c.json(
    s
      ? {
          authenticated: true,
          ...s,
          admin: cfg.admins.includes(s.owner),
          validator: cfg.validators.includes(s.owner) || cfg.admins.includes(s.owner),
        }
      : { authenticated: false },
  );
});
auth.post('/logout', async (c) => {
  const token = getCookie(c, 'openmaas_session');
  if (token)
    await c.env.DB.prepare('DELETE FROM sessions WHERE id=?')
      .bind(await hash(token))
      .run();
  deleteCookie(c, 'openmaas_session', { path: '/' });
  return c.json({ ok: true });
});
export async function identity(c: any, next: () => Promise<void>) {
  const token = getCookie(c, 'openmaas_session');
  const s = token
    ? await c.env.DB.prepare('SELECT owner,name FROM sessions WHERE id=? AND expires_at>?')
        .bind(await hash(token), Date.now())
        .first()
    : null;
  if (!s) return c.json({ error: 'Login required' }, 401);
  c.set('owner', s.owner);
  c.set('name', s.name);
  await next();
}
export async function admin(c: any, next: () => Promise<void>) {
  const cfg = await config(c.env);
  if (!cfg.admins.includes(c.get('owner')))
    return c.json({ error: 'Administrator permission required' }, 403);
  await next();
}
