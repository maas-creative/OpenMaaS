import { readFileSync, writeFileSync } from 'node:fs';
import { gtfsSql } from './gtfs-sql';
const [file, sourceId, out] = process.argv.slice(2);
if (!file || !sourceId) throw new Error('Usage: import:gtfs ZIP SOURCE_ID [SQL_OUTPUT]');
const { statements, count } = gtfsSql(new Uint8Array(readFileSync(file)), sourceId);
writeFileSync(out || '/tmp/openmaas-gtfs-import.sql', statements.join('\n'));
console.log(`Validated ${count} records. Import SQL: ${out || '/tmp/openmaas-gtfs-import.sql'}`);
