import type { Env, Source } from './model';
import { config, publish, records } from './store';
import { loadSource } from './connectors';
import { parseGtfs, parseRealtime, realtimeReferenceStatus } from './gtfs';
import { request, UpstreamError, boundedBody } from './http';
export async function syncSource(env: Env, s: Source) {
  if (['booking', 'expedia', 'uber', 'google-calendar', 'masabi'].includes(s.kind))
    return 'query-only';
  if (s.kind === 'gtfs' && s.params.ingestion === 'cli') return 'cli-required';
  const now = new Date().toISOString();
  // One lease across scheduled and interactive imports, including connpass throttling.
  const lease = await env.DB.prepare(
    "INSERT INTO source_state(id,status,last_attempt,next_attempt) VALUES(?,'syncing',?,?) ON CONFLICT(id) DO UPDATE SET status='syncing',last_attempt=excluded.last_attempt,next_attempt=excluded.next_attempt WHERE source_state.next_attempt IS NULL OR source_state.next_attempt<=?",
  )
    .bind(s.id, now, new Date(Date.now() + 300000).toISOString(), now)
    .run();
  if (!lease.meta.changes) return 'waiting';
  try {
    if (s.kind === 'gtfs' || s.kind === 'gtfs-rt') {
      const response = await request(s.url!);
      const len = Number(response.headers.get('content-length'));
      if (len > 50 * 1024 * 1024) throw new Error('Feed too large: use CLI');
      const bytes = await boundedBody(response, 50 * 1024 * 1024);
      const items = s.kind === 'gtfs' ? parseGtfs(bytes, s.id) : parseRealtime(bytes, s);
      if (s.kind === 'gtfs-rt') {
        const trips = (await records(env, 'gtfs:trips')).filter(
          (t) => t.sourceId === s.staticSourceId,
        );
        if (!trips.length) throw new Error('Import the matching static GTFS before GTFS-RT');
        const ids = new Set(trips.map((t) => t.trip_id));
        for (const item of items)
          (item.body as any).referenceStatus = realtimeReferenceStatus(item.body, ids);
      }
      if (items.length > 10000)
        throw new Error('Feed exceeds Worker import limit: use CLI ingestion');
      await publish(env, s.id, items, s.intervalSeconds, bytes);
    } else {
      const r = await loadSource(s, env);
      await publish(env, s.id, r.items, r.ttl || s.intervalSeconds);
    }
    return 'updated';
  } catch (e) {
    const retry = e instanceof UpstreamError ? e.retryAfter : s.intervalSeconds;
    const error =
      e instanceof UpstreamError
        ? e.message
        : e instanceof SyntaxError
          ? 'Invalid upstream response'
          : e instanceof Error
            ? e.message
            : 'Import failed';
    await env.DB.prepare("UPDATE source_state SET status='error',error=?,next_attempt=? WHERE id=?")
      .bind(error, new Date(Date.now() + retry * 1000).toISOString(), s.id)
      .run();
    throw e;
  }
}
export async function syncAll(env: Env) {
  const cfg = await config(env);
  for (const s of cfg.sources.filter((s) => s.enabled)) {
    try {
      await syncSource(env, s);
    } catch {
      console.error(JSON.stringify({ event: 'source_sync_failed', source: s.id }));
    }
  }
}
