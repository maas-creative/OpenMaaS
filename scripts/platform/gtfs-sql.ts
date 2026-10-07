import { parseGtfs } from '../../services/platform/src/gtfs';
export function gtfsSql(bytes: Uint8Array, sourceId: string) {
  const items = parseGtfs(bytes, sourceId, true),
    version = crypto.randomUUID(),
    now = new Date().toISOString();
  const sql = (v: string) => `'${v.replaceAll("'", "''")}'`;
  const statements = items.map(
    (r) =>
      `INSERT INTO records(source_id,kind,id,body,version) VALUES(${[sourceId, r.kind, r.id, JSON.stringify(r.body), version].map(sql).join(',')});`,
  );
  statements.push(
    `INSERT INTO source_state(id,status,last_attempt,last_success,version) VALUES(${sql(sourceId)},'ok',${sql(now)},${sql(now)},${sql(version)}) ON CONFLICT(id) DO UPDATE SET status='ok',last_attempt=excluded.last_attempt,last_success=excluded.last_success,version=excluded.version;`,
  );
  statements.push(
    `DELETE FROM records WHERE source_id=${sql(sourceId)} AND version<>${sql(version)};`,
  );
  return { version, statements, count: items.length };
}
