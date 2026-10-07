import { Hono } from 'hono';
import { connectorDefinitions } from './registry';
import { config } from './store';
import { type AppEnv } from './auth';
import { type Env, type Source, secret } from './model';
import { loadSource } from './connectors';
import { request, json, UpstreamError } from './http';
import { uberRequest } from './providers';
export async function checkConnection(s: Source, env: Env) {
  const d = connectorDefinitions[s.kind];
  const credentials =
    s.kind === 'uber' && s.params.clientId
      ? [s.params.clientSecretRef]
      : d.credentialRequired
        ? [s.secretRef]
        : [];
  if (s.kind === 'expedia') credentials.push(s.secretRef ? s.secretRef + '_SHARED' : undefined);
  if (s.kind === 'google-calendar' || (s.kind === 'expedia' && s.operations.includes('reserve')))
    credentials.push('OAUTH_ENCRYPTION_KEY');
  let status = 'available',
    hint = '公開情報への接続を確認しました。取引権限は別途確認が必要です。';
  let count: number | undefined;
  try {
    if (!d.implemented) {
      status = 'specification-required';
      hint = '正式なAPI仕様と利用環境が必要です。';
    } else if (
      d.required.some((k) => !s.params[k]) ||
      (['gtfs', 'gtfs-rt', 'gbfs'].includes(s.kind) && !s.url)
    ) {
      status = 'configuration-required';
      hint = '必須の接続設定を入力してください。';
    } else if (credentials.some((ref) => !ref || typeof env[ref] !== 'string' || !env[ref])) {
      status = 'credential-required';
      hint = 'CLIから資格情報を登録してください。';
    } else if (['gtfs', 'gtfs-rt'].includes(s.kind)) {
      const r = await request(s.url!, { method: 'HEAD' });
      hint = `フィードにアクセスできました (${r.status})。ID対応は取込時に検証します。`;
    } else if (s.kind === 'uber') {
      await uberRequest(s, env, '/zones');
      hint = '法人環境にアクセスできました。配車の実行権限はsandboxで確認してください。';
    } else if (['google-calendar', 'booking', 'expedia'].includes(s.kind)) {
      status = 'configured';
      hint = '設定済み。利用者認可または検索条件を伴う接続確認が必要です。';
    } else {
      const r = await loadSource(s, env);
      count = r.items.length;
    }
  } catch (e) {
    status =
      e instanceof UpstreamError
        ? [401, 403].includes(e.status)
          ? 'permission-denied'
          : e.status === 429
            ? 'rate-limited'
            : 'upstream-unavailable'
        : 'schema-mismatch';
    hint =
      status === 'rate-limited'
        ? '提供元の再試行時刻を待ってください。'
        : status === 'permission-denied'
          ? '資格情報と対象へのアクセス権限を確認してください。'
          : 'API版・設定・提供元の応答を確認してください。';
  }
  const result = {
    sourceId: s.id,
    status,
    hint,
    count,
    checkedAt: new Date().toISOString(),
    verifiedOperations:
      status === 'available'
        ? d.capabilities.filter((c) => ['read', 'search', 'external', 'availability'].includes(c))
        : [],
    configuredOperations: s.operations,
    apiVersion: s.params.apiVersion || null,
    region: s.region,
  };
  await env.DB.prepare('INSERT OR REPLACE INTO connection_checks VALUES(?,?,?,?)')
    .bind(s.id, status, JSON.stringify(result), result.checkedAt)
    .run();
  return result;
}
export const diagnostics = new Hono<AppEnv>();
diagnostics.get('/connectors', (c) => c.json(Object.values(connectorDefinitions)));
diagnostics.get('/connections', async (c) =>
  c.json(
    (
      await c.env.DB.prepare('SELECT body FROM connection_checks').all<{ body: string }>()
    ).results.map((r) => JSON.parse(r.body)),
  ),
);
diagnostics.post('/connections/:id/check', async (c) => {
  const s = (await config(c.env)).sources.find((s) => s.id === c.req.param('id'));
  return s
    ? c.json(await checkConnection(s, c.env))
    : c.json({ error: 'Connection not found' }, 404);
});
diagnostics.get('/connections/:id/orders', async (c) => {
  const s = (await config(c.env)).sources.find(
    (s) => s.id === c.req.param('id') && s.kind === 'eventbrite' && s.enabled,
  );
  if (!s) return c.json({ error: 'Eventbrite connection not found' }, 404);
  const page = Number(c.req.query('page') || 1);
  if (!Number.isInteger(page) || page < 1) return c.json({ error: 'Invalid page' }, 400);
  const r = await json(
    `https://www.eventbriteapi.com/v3/organizations/${encodeURIComponent(s.params.organizationId)}/orders/?page=${page}`,
    { headers: { Authorization: `Bearer ${secret(c.env, s.secretRef)}` } },
  );
  return c.json({
    orders: r.orders?.map((o: any) => ({
      id: o.id,
      eventId: o.event_id,
      status: o.status,
      created: o.created,
      changed: o.changed,
    })),
    pagination: r.pagination,
  });
});
