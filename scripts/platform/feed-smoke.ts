import { writeFileSync } from 'node:fs';
import { parseGtfs, parseRealtime } from '../../services/platform/src/gtfs';
import { loadGbfs } from '../../services/platform/src/connectors';
import { SourceSchema } from '../../services/platform/src/model';
async function main() {
  const results: any[] = [];
  for (const [kind, url] of [
    ['gtfs', 'https://www.bart.gov/dev/schedules/google_transit.zip'],
    ['gtfs-rt', 'https://cdn.mbta.com/realtime/TripUpdates.pb'],
    ['gbfs', 'https://gbfs.citibikenyc.com/gbfs/2.3/gbfs.json'],
  ]) {
    const source = SourceSchema.parse({
      id: `live-${kind}`,
      kind,
      label: kind,
      url,
      attribution: kind === 'gtfs' ? 'BART' : kind === 'gbfs' ? 'Citi Bike' : 'MBTA',
      termsUrl:
        kind === 'gtfs'
          ? 'https://www.bart.gov/schedules/developers'
          : kind === 'gbfs'
            ? 'https://citibikenyc.com/system-data'
            : 'https://www.mbta.com/developers',
      ...(kind === 'gtfs-rt' ? { staticSourceId: 'mbta' } : {}),
    });
    try {
      let count = 0;
      if (kind === 'gbfs') {
        count = (await loadGbfs(source, fetch)).items.length;
      } else {
        const r = await fetch(url);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const b = new Uint8Array(await r.arrayBuffer());
        count = kind === 'gtfs' ? parseGtfs(b, source.id).length : parseRealtime(b, source).length;
      }
      results.push({
        kind,
        url,
        status: 'passed',
        records: count,
        at: new Date().toISOString(),
        scope:
          kind === 'gtfs-rt'
            ? 'Protobuf decoding only; static feed identity matching not verified'
            : 'Public feed retrieval and parsing',
      });
    } catch (e) {
      results.push({
        kind,
        url,
        status: 'failed',
        error: (e as Error).message,
        at: new Date().toISOString(),
      });
    }
  }
  writeFileSync('docs/platform/public-feed-results.json', JSON.stringify(results, null, 2) + '\n');
  console.log(results);
  if (results.some((r) => r.status === 'failed')) process.exitCode = 1;
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
