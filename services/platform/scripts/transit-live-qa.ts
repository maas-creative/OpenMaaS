import { Miniflare } from 'miniflare';
import { readFileSync, readdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { hash } from '../src/auth';
import { app } from '../src/index';
import { ConfigSchema, type Env } from '../src/model';
// Isolated loopback QA server. Public API calls are real; no writes to external accounts or payments.
const mf = new Miniflare({
  modules: true,
  script: 'export default {fetch(){return new Response("ok")}}',
  compatibilityDate: '2026-08-01',
  d1Databases: { DB: 'transit-qa' },
  r2Buckets: ['FEEDS'],
});
const env = {
  DB: await mf.getD1Database('DB'),
  FEEDS: await mf.getR2Bucket('FEEDS'),
  APP_ORIGIN: 'http://localhost:3001',
  API_ORIGIN: 'http://localhost:8789',
} as unknown as Env;
const migrations = new URL('../migrations/', import.meta.url);
for (const f of readdirSync(migrations)
  .filter((f) => f.endsWith('.sql'))
  .sort())
  for (const statement of readFileSync(new URL(f, migrations), 'utf8')
    .split(';')
    .filter((s) => s.trim()))
    await env.DB.prepare(statement).run();
await env.DB.prepare('INSERT INTO settings VALUES(1,?,1,?)')
  .bind(
    JSON.stringify(
      ConfigSchema.parse({
        version: 1,
        name: 'OpenMaaS',
        region: '日本',
        contact: '',
        features: { activities: true, transit: true, accommodations: false, commerce: false },
        sources: [],
        journey: { provider: 'transit-api' },
      }),
    ),
    new Date().toISOString(),
  )
  .run();
// Optional synthetic identity only in this loopback QA server and isolated database.
// This is not a real OIDC account and does not exist in the application Worker.
const fixtureToken = process.argv.includes('--auth-fixture') ? crypto.randomUUID() : undefined;
if (fixtureToken)
  await env.DB.prepare('INSERT INTO sessions VALUES(?,?,?,?)')
    .bind(await hash(fixtureToken), 'qa|route-user', '経路画面試験ユーザー', Date.now() + 3600000)
    .run();
const server = createServer(async (req, res) => {
  try {
    if (fixtureToken && req.url === '/qa/login-fixture') {
      res.writeHead(302, {
        'Set-Cookie': `openmaas_session=${fixtureToken}; HttpOnly; SameSite=Lax; Path=/; Max-Age=3600`,
        Location: 'http://localhost:3001/journey',
      });
      res.end();
      return;
    }
    const chunks: Buffer[] = [];
    for await (const b of req) chunks.push(Buffer.from(b));
    const r = await app.request(
      `http://localhost:8789${req.url}`,
      {
        method: req.method,
        headers: req.headers as Record<string, string>,
        ...(!['GET', 'HEAD'].includes(req.method || 'GET') ? { body: Buffer.concat(chunks) } : {}),
      },
      env,
    );
    res.writeHead(r.status, Object.fromEntries(r.headers));
    res.end(Buffer.from(await r.arrayBuffer()));
  } catch {
    res.writeHead(500);
    res.end('QA server error');
  }
});
server.listen(8789, '127.0.0.1', () =>
  console.log('Isolated OpenMaaS API QA: http://localhost:8789; Transit API upstream is live'),
);
process.on('SIGINT', () => {
  server.close();
  void mf.dispose().then(() => process.exit());
});
