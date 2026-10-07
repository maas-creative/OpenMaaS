import { readFileSync, writeFileSync } from 'node:fs';
import { ConfigSchema } from '../../services/platform/src/model';
import { zodToJsonSchema } from 'zod-to-json-schema';
async function main() {
  const [command, file] = process.argv.slice(2);
  if (command === 'schema') {
    writeFileSync(
      file || 'examples/platform/config.schema.json',
      JSON.stringify(zodToJsonSchema(ConfigSchema, 'OpenMaaS'), null, 2) + '\n',
    );
  } else {
    if (!file) throw new Error('Specify a configuration file');
    const cfg = ConfigSchema.parse(JSON.parse(readFileSync(file, 'utf8')));
    if (command === 'validate') console.log(`Valid: ${cfg.name} (${cfg.sources.length} sources)`);
    else if (command === 'bootstrap') {
      const origin = process.env.OPENMAAS_API_ORIGIN || 'http://localhost:8787';
      const token = process.env.OPENMAAS_BOOTSTRAP_TOKEN;
      if (!token) throw new Error('Set OPENMAAS_BOOTSTRAP_TOKEN');
      const r = await fetch(`${origin}/api/v1/bootstrap`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg),
      });
      if (!r.ok) throw new Error(`Bootstrap failed: ${r.status}`);
      console.log('Configured');
    } else throw new Error('Use validate, schema, or bootstrap');
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
