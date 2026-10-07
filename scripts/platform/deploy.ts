import { readFileSync, writeFileSync, mkdirSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { gtfsSql } from './gtfs-sql';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { randomBytes } from 'node:crypto';
import { ConfigSchema } from '../../services/platform/src/model';
import { connectorDefinitions } from '../../services/platform/src/registry';
const root = resolve(import.meta.dirname, '../..'),
  dir = resolve(process.env.OPENMAAS_DEPLOY_DIR || root + '/deployment');
const file = (name: string) => resolve(dir, name);
function read(name: string) {
  return JSON.parse(readFileSync(file(name), 'utf8'));
}
async function run(args: string[], cwd = root, input?: string, extra: Record<string, string> = {}) {
  await new Promise<void>((ok, fail) => {
    const p = spawn('npx', args, {
      cwd,
      env: { ...process.env, ...extra },
      stdio: [input === undefined ? 'inherit' : 'pipe', 'inherit', 'inherit'],
      shell: false,
    });
    if (input !== undefined) {
      p.stdin!.end(input);
    }
    p.on('error', fail);
    p.on('exit', (code) => (code === 0 ? ok() : fail(new Error(`Command failed (${code})`))));
  });
}
async function cf(path: string, method = 'GET', body?: unknown) {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID,
    token = process.env.CLOUDFLARE_API_TOKEN;
  if (!account || !token) throw new Error('Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN');
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = (await r.json()) as any;
  if (!r.ok || !data.success) throw new Error(`Cloudflare ${method} ${path} failed (${r.status})`);
  return data.result;
}
async function main() {
  const [cmd, arg, extraArg] = process.argv.slice(2);
  if (cmd === 'init') {
    if (existsSync(file('deployment.json')))
      throw new Error('Deployment already initialized; edit the existing configuration');
    const preset = arg || 'event-transit';
    if (!['event-transit', 'tourism', 'local-transit', 'ticket-sales'].includes(preset))
      throw new Error('Choose one of the four configuration examples');
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const ask = async (label: string, env: string) =>
      process.env[env] || (await rl.question(label + ': '));
    try {
      const name = await ask('導入識別名（英小文字・数字・ハイフン）', 'OPENMAAS_DEPLOY_NAME');
      if (!/^[a-z][a-z0-9-]{1,40}$/.test(name)) throw new Error('Invalid deployment name');
      const appOrigin = await ask('WebのHTTPS origin', 'OPENMAAS_APP_ORIGIN'),
        apiOrigin = await ask('APIのHTTPS origin', 'OPENMAAS_API_ORIGIN');
      for (const value of [appOrigin, apiOrigin]) {
        const u = new URL(value);
        if (u.protocol !== 'https:' || u.origin !== value)
          throw new Error('Use HTTPS origin without path or trailing slash');
      }
      const appHost = new URL(appOrigin).hostname,
        apiHost = new URL(apiOrigin).hostname;
      if (
        appHost === apiHost ||
        appHost.split('.').slice(1).join('.') !== apiHost.split('.').slice(1).join('.') ||
        appHost.endsWith('.workers.dev')
      )
        throw new Error('Use separate Web/API subdomains under the same custom domain');
      const issuer = await ask('OIDC issuer', 'OPENMAAS_OIDC_ISSUER'),
        clientId = await ask('OIDC client ID', 'OPENMAAS_OIDC_CLIENT_ID'),
        subject = await ask('管理者のOIDC subject', 'OPENMAAS_ADMIN_SUBJECT');
      if (!subject.trim()) throw new Error('Administrator subject required');
      const config = ConfigSchema.parse({
        ...JSON.parse(readFileSync(root + `/examples/platform/${preset}.json`, 'utf8')),
        name,
        oidc: { issuer, clientId },
        admins: [`${issuer}|${subject}`],
      });
      mkdirSync(dir, { recursive: true });
      writeFileSync(file('config.json'), JSON.stringify(config, null, 2) + '\n');
      writeFileSync(
        file('deployment.json'),
        JSON.stringify({ name, appOrigin, apiOrigin }, null, 2) + '\n',
      );
      console.log(
        '設定を作成しました。接続を設定し、npm run platform -- validate を実行してください。',
      );
      console.log(
        `OIDC callback: ${apiOrigin}/api/v1/auth/callback\nStripe webhook: ${apiOrigin}/api/v1/webhooks/stripe\nGoogle callback: ${apiOrigin}/api/v1/integrations/google/callback`,
      );
    } finally {
      rl.close();
    }
  } else if (cmd === 'validate') {
    const cfg = ConfigSchema.parse(read('config.json'));
    const required = cfg.sources
      .filter((s) => s.enabled)
      .flatMap((s) => {
        const d = connectorDefinitions[s.kind];
        return d.required.filter((k) => !s.params[k]).map((k) => `${s.id}.params.${k}`);
      });
    if (required.length) throw new Error('Missing: ' + required.join(', '));
    console.log(`Valid: ${cfg.name}`);
  } else if (cmd === 'secrets') {
    if (!/^[A-Z][A-Z0-9_]+$/.test(arg || ''))
      throw new Error(
        'Specify the secret reference name; never pass its value on the command line',
      );
    if (!existsSync(file('api.wrangler.json')))
      throw new Error(
        'Run deploy first to prepare the Worker, or use wrangler secret put with your existing config',
      );
    await run(['wrangler', 'secret', 'put', arg, '--config', file('api.wrangler.json')]);
  } else if (cmd === 'import-gtfs') {
    const cfg = ConfigSchema.parse(read('config.json')),
      d = read('deployment.json');
    const source = cfg.sources.find(
      (s) => s.id === arg && s.kind === 'gtfs' && s.enabled && s.params.ingestion === 'cli',
    );
    if (!source || !extraArg)
      throw new Error(
        'Use import-gtfs SOURCE_ID ZIP for an enabled GTFS source with ingestion=cli',
      );
    if (!existsSync(file('api.wrangler.json'))) throw new Error('Deploy the API before importing');
    const data = gtfsSql(new Uint8Array(readFileSync(resolve(extraArg))), source.id);
    const temp = mkdtempSync(resolve(tmpdir(), 'openmaas-import-'));
    try {
      const output = resolve(temp, 'import.sql');
      writeFileSync(output, data.statements.join('\n'));
      await run([
        'wrangler',
        'r2',
        'object',
        'put',
        `${d.name}-feeds/${source.id}/${data.version}.zip`,
        '--file',
        resolve(extraArg),
        '--remote',
        '--config',
        file('api.wrangler.json'),
      ]);
      await run([
        'wrangler',
        'd1',
        'execute',
        'DB',
        '--remote',
        '--file',
        output,
        '--config',
        file('api.wrangler.json'),
      ]);
      console.log(`Imported ${data.count} validated records. Version: ${data.version}`);
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
  } else if (cmd === 'doctor') {
    const d = read('deployment.json'),
      cfg = ConfigSchema.parse(read('config.json'));
    const r = await fetch(d.apiOrigin + '/api/v1/config');
    if (!r.ok) throw new Error('API not reachable');
    const publicConfig = (await r.json()) as any;
    if (publicConfig.name !== cfg.name) throw new Error('Deployment configuration differs');
    const web = await fetch(d.appOrigin);
    if (!web.ok) throw new Error('Web not reachable');
    console.log(
      'Web/API reachable. Log in as administrator and run each connection diagnosis at ' +
        d.appOrigin +
        '/connections',
    );
  } else if (cmd === 'deploy') {
    const d = read('deployment.json'),
      cfg = ConfigSchema.parse(read('config.json'));
    const account = process.env.CLOUDFLARE_ACCOUNT_ID;
    if (!account) throw new Error('CLOUDFLARE_ACCOUNT_ID required');
    const dbName = d.name + '-db',
      bucket = d.name + '-feeds';
    const dbs = await cf('/d1/database');
    let db = dbs.find((b: any) => b.name === dbName);
    if (!db) db = await cf('/d1/database', 'POST', { name: dbName });
    const buckets = await cf('/r2/buckets');
    if (!buckets.buckets.some((b: any) => b.name === bucket))
      await cf('/r2/buckets', 'POST', { name: bucket });
    const api = {
      name: d.name + '-api',
      account_id: account,
      main: root + '/services/platform/src/index.ts',
      compatibility_date: '2026-08-01',
      compatibility_flags: ['nodejs_compat'],
      observability: { enabled: true },
      vars: { APP_ORIGIN: d.appOrigin, API_ORIGIN: d.apiOrigin },
      d1_databases: [
        {
          binding: 'DB',
          database_name: dbName,
          database_id: db.uuid,
          migrations_dir: root + '/services/platform/migrations',
        },
      ],
      r2_buckets: [{ binding: 'FEEDS', bucket_name: bucket }],
      ratelimits: [
        { name: 'SEARCH_LIMITER', namespace_id: '1001', simple: { limit: 30, period: 60 } },
      ],
      triggers: { crons: ['* * * * *'] },
      routes: [{ pattern: new URL(d.apiOrigin).hostname, custom_domain: true }],
    };
    const web = {
      name: d.name + '-web',
      account_id: account,
      main: root + '/apps/web/.open-next/worker.js',
      compatibility_date: '2026-08-01',
      compatibility_flags: ['nodejs_compat'],
      assets: { directory: root + '/apps/web/.open-next/assets', binding: 'ASSETS' },
      routes: [{ pattern: new URL(d.appOrigin).hostname, custom_domain: true }],
    };
    writeFileSync(file('api.wrangler.json'), JSON.stringify(api, null, 2));
    writeFileSync(file('web.wrangler.json'), JSON.stringify(web, null, 2));
    await run([
      'wrangler',
      'd1',
      'migrations',
      'apply',
      'DB',
      '--remote',
      '--config',
      file('api.wrangler.json'),
    ]);
    await run(['wrangler', 'deploy', '--config', file('api.wrangler.json')]);
    if (!existsSync(file('initialized.json'))) {
      const existing = await cf(`/workers/scripts/${api.name}/secrets`),
        names = new Set(existing.map((s: any) => s.name));
      const bootstrap = randomBytes(32).toString('hex'),
        secrets: Record<string, string> = { BOOTSTRAP_TOKEN: bootstrap };
      if (!names.has('TICKET_SECRET')) secrets.TICKET_SECRET = randomBytes(32).toString('hex');
      if (!names.has('OAUTH_ENCRYPTION_KEY'))
        secrets.OAUTH_ENCRYPTION_KEY = randomBytes(32).toString('hex');
      await run(
        ['wrangler', 'secret', 'bulk', '--config', file('api.wrangler.json')],
        root,
        JSON.stringify(secrets),
      );
      const r = await fetch(d.apiOrigin + '/api/v1/bootstrap', {
        method: 'POST',
        headers: { Authorization: `Bearer ${bootstrap}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg),
      });
      if (!r.ok && r.status !== 409) throw new Error(`Bootstrap failed (${r.status})`);
      writeFileSync(
        file('initialized.json'),
        JSON.stringify({ name: d.name, at: new Date().toISOString() }),
      );
    }
    await run(['opennextjs-cloudflare', 'build'], root + '/apps/web', undefined, {
      NEXT_PUBLIC_PLATFORM_API_URL: d.apiOrigin,
    });
    await run(['wrangler', 'deploy', '--config', file('web.wrangler.json')], root + '/apps/web');
    console.log(
      '配置しました。資格情報の登録・OIDC callback設定後、doctorと管理画面の接続診断を実行してください。',
    );
  } else throw new Error('Use init, validate, secrets, doctor, deploy, import-gtfs');
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
