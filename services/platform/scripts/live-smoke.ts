import { Miniflare } from 'miniflare';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { app } from '../src/index';
import { ConfigSchema, SourceSchema, type Env } from '../src/model';
import { syncSource } from '../src/sync';

// Public feed only. Isolated D1/R2; no account, reservation, or payment writes.
async function main() {
  const mf = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("ok")}}',
    compatibilityDate: '2026-08-01',
    d1Databases: { DB: 'live-smoke' },
    r2Buckets: ['FEEDS'],
  });
  const result: Record<string, unknown> = {
    at: new Date().toISOString(),
    scope: 'Live GBFS → syncSource → isolated D1/R2 → application API; not commercial transactions',
  };
  try {
    const env = {
      DB: await mf.getD1Database('DB'),
      FEEDS: await mf.getR2Bucket('FEEDS'),
      APP_ORIGIN: 'http://localhost:3000',
      API_ORIGIN: 'http://localhost:8787',
    } as unknown as Env;
    const migrations = new URL('../migrations/', import.meta.url);
    for (const name of readdirSync(migrations)
      .filter((n) => n.endsWith('.sql'))
      .sort())
      for (const statement of readFileSync(new URL(name, migrations), 'utf8')
        .split(';')
        .filter((s) => s.trim()))
        await env.DB.prepare(statement).run();
    const source = SourceSchema.parse({
      id: 'citibike-live',
      kind: 'gbfs',
      label: 'Citi Bike',
      url: 'https://gbfs.citibikenyc.com/gbfs/2.3/gbfs.json',
      attribution: 'Citi Bike',
      termsUrl: 'https://citibikenyc.com/system-data',
    });
    const config = ConfigSchema.parse({
      version: 1,
      name: 'Live verification',
      region: 'New York',
      contact: 'MaaS Creative',
      features: { activities: true, transit: true, accommodations: false, commerce: false },
      sources: [source],
    });
    await env.DB.prepare('INSERT INTO settings VALUES(1,?,1,?)')
      .bind(JSON.stringify(config), new Date().toISOString())
      .run();
    const status = await syncSource(env, source);
    result.sync = status;
    if (status !== 'updated') throw new Error(`Sync failed: ${status}`);
    const response = await app.request('http://localhost/api/v1/shared-mobility', {}, env);
    const rows = (await response.json()) as any[];
    if (response.status !== 200 || !Array.isArray(rows) || !rows.length)
      throw new Error('API did not return live records');
    result.records = rows.length;
    result.feeds = [...new Set(rows.map((r) => r.feed))];
    result.freshStatusRecords = rows.filter(
      (r) =>
        ['station_status', 'vehicle_status', 'free_bike_status'].includes(r.feed) &&
        r.stale === false,
    ).length;
    if (!result.freshStatusRecords) throw new Error('No fresh availability records');
    const denied = await app.request('http://localhost/api/v1/plans', {}, env);
    if (denied.status !== 401) throw new Error('Private plans accessible anonymously');
    result.privatePlansStatus = denied.status;
    result.status = 'passed';
  } catch (error) {
    result.status = 'failed';
    result.error = (error as Error).message;
    process.exitCode = 1;
  } finally {
    await mf.dispose();
    writeFileSync('docs/platform/live-worker-results.json', JSON.stringify(result, null, 2) + '\n');
    console.log(result);
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
