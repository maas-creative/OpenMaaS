import { ConfigSchema, defaultConfig, type Config, type Env, type RecordItem } from './model';
export async function config(env: Env): Promise<Config> {
  const row = await env.DB.prepare('SELECT body FROM settings WHERE id=1').first<{
    body: string;
  }>();
  return row ? ConfigSchema.parse(JSON.parse(row.body)) : defaultConfig;
}
export async function audit(env: Env, actor: string, action: string, target: string) {
  await env.DB.prepare('INSERT INTO audit(actor,action,target,created_at) VALUES(?,?,?,?)')
    .bind(actor, action, target, new Date().toISOString())
    .run();
}
export async function records(env: Env, kind: string): Promise<any[]> {
  const r = await env.DB.prepare(
    'SELECT r.body FROM records r JOIN source_state s ON s.id=r.source_id AND s.version=r.version WHERE r.kind=?',
  )
    .bind(kind)
    .all<{ body: string }>();
  const cfg = await config(env);
  const enabled = new Set(cfg.sources.filter((s) => s.enabled).map((s) => s.id));
  return r.results
    .map((x) => JSON.parse(x.body))
    .filter((x) => enabled.has(x.sourceId))
    .map((x) => {
      if (
        kind === 'shared-mobility' &&
        ['station_status', 'vehicle_status', 'free_bike_status'].includes(x.feed)
      ) {
        const epoch = typeof x.updated === 'number' ? x.updated : Date.parse(x.updated) / 1000;
        x.stale =
          !Number.isFinite(epoch) || Date.now() / 1000 - epoch > Math.max(60, x.ttl || 60) * 2;
      }
      if (kind === 'realtime' && x.timestamp)
        x.stale =
          Date.now() / 1000 - Number(x.timestamp) >
          (cfg.sources.find((s) => s.id === x.sourceId)?.intervalSeconds || 60) * 2;
      return x;
    });
}
export async function publish(
  env: Env,
  sourceId: string,
  items: RecordItem[],
  nextSeconds: number,
  raw?: Uint8Array,
) {
  const previous = await env.DB.prepare('SELECT version FROM source_state WHERE id=?')
    .bind(sourceId)
    .first<{ version: string }>();
  const version = crypto.randomUUID();
  const now = new Date().toISOString();
  if (raw) await env.FEEDS.put(`${sourceId}/${version}`, raw);
  for (let i = 0; i < items.length; i += 75)
    await env.DB.batch(
      items
        .slice(i, i + 75)
        .map((r) =>
          env.DB.prepare(
            'INSERT INTO records(source_id,kind,id,body,version) VALUES(?,?,?,?,?)',
          ).bind(sourceId, r.kind, r.id, JSON.stringify(r.body), version),
        ),
    );
  await env.DB.prepare(
    "INSERT INTO source_state(id,status,last_attempt,last_success,next_attempt,version,error) VALUES(?,'ok',?,?,?,?,NULL) ON CONFLICT(id) DO UPDATE SET status='ok',last_attempt=excluded.last_attempt,last_success=excluded.last_success,next_attempt=excluded.next_attempt,version=excluded.version,error=NULL",
  )
    .bind(sourceId, now, now, new Date(Date.now() + nextSeconds * 1000).toISOString(), version)
    .run();
  await env.DB.prepare('DELETE FROM records WHERE source_id=? AND version<>?')
    .bind(sourceId, version)
    .run();
  if (previous?.version) await env.FEEDS.delete(`${sourceId}/${previous.version}`);
}
