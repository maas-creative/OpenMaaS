import { unzipSync } from 'fflate';
import { parse } from 'csv-parse/sync';
import gtfsRealtime from 'gtfs-realtime-bindings';
import type { RecordItem, Source } from './model';
const tableKeys: Record<string, string> = {
  agency: 'agency_id',
  stops: 'stop_id',
  routes: 'route_id',
  trips: 'trip_id',
  calendar: 'service_id',
  calendar_dates: 'service_id',
  shapes: 'shape_id',
  fare_attributes: 'fare_id',
  fare_rules: 'fare_id',
  fare_products: 'fare_product_id',
  fare_leg_rules: 'leg_group_id',
  booking_rules: 'booking_rule_id',
  transfers: 'from_stop_id',
};
export function parseGtfs(bytes: Uint8Array, sourceId: string, large = false): RecordItem[] {
  if (!large && bytes.byteLength > 50 * 1024 * 1024)
    throw new Error('Use CLI for feeds larger than 50MB');
  let expanded = 0;
  const files = unzipSync(bytes, {
    filter: (f) => {
      expanded += f.originalSize;
      if (expanded > (large ? 1024 : 150) * 1024 * 1024)
        throw new Error('Expanded feed exceeds limit');
      return f.name.endsWith('.txt');
    },
  });
  const tables: Record<string, any[]> = {};
  for (const [name, data] of Object.entries(files)) {
    const table = name
      .split('/')
      .pop()!
      .replace(/\.txt$/, '');
    tables[table] = parse(new TextDecoder().decode(data), {
      columns: true,
      skip_empty_lines: true,
      bom: true,
      relax_column_count: false,
    });
  }
  for (const t of ['agency', 'stops', 'routes', 'trips', 'stop_times'])
    if (!tables[t]?.length) throw new Error(`Missing ${t}.txt`);
  if (!tables.calendar?.length && !tables.calendar_dates?.length)
    throw new Error('Missing service calendar');
  const ids = (t: string, k: string) => new Set(tables[t].map((x) => x[k]));
  const stops = ids('stops', 'stop_id'),
    routes = ids('routes', 'route_id'),
    trips = ids('trips', 'trip_id');
  const serviceIds = new Set(
    [...(tables.calendar || []), ...(tables.calendar_dates || [])].map((x) => x.service_id),
  );
  for (const t of tables.trips)
    if (!routes.has(t.route_id) || !serviceIds.has(t.service_id))
      throw new Error('Unknown route/service in trip');
  for (const t of tables.stop_times) {
    if (!stops.has(t.stop_id) || !trips.has(t.trip_id))
      throw new Error('Unknown stop/trip in stop_times');
    for (const k of ['arrival_time', 'departure_time'])
      if (t[k] && !/^\d{2,}:([0-5]\d):([0-5]\d)$/.test(t[k])) throw new Error('Invalid GTFS time');
  }
  const result: RecordItem[] = [];
  for (const [table, rows] of Object.entries(tables))
    for (const [i, r] of rows.entries()) {
      const id =
        table === 'stop_times'
          ? `${r.trip_id}:${r.stop_sequence}`
          : table === 'calendar_dates'
            ? `${r.service_id}:${r.date}`
            : table === 'shapes'
              ? `${r.shape_id}:${r.shape_pt_sequence}`
              : ['fare_rules', 'fare_leg_rules', 'transfers'].includes(table)
                ? String(i)
                : r[tableKeys[table]] || String(i);
      result.push({
        kind: `gtfs:${table}`,
        id,
        body: { ...r, id: `${sourceId}:${id}`, sourceId, externalId: id },
      });
    }
  return result;
}
export function serviceRuns(serviceId: string, date: string, calendar: any[], exceptions: any[]) {
  const day = date.replaceAll('-', '');
  const ex = exceptions.find((x) => x.service_id === serviceId && x.date === day);
  if (ex) return ex.exception_type === '1';
  const c = calendar.find((x) => x.service_id === serviceId);
  if (!c || day < c.start_date || day > c.end_date) return false;
  const weekday = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
    new Date(`${date}T12:00:00Z`).getUTCDay()
  ];
  return c[weekday] === '1';
}
export function seconds(time: string) {
  const [h, m, s] = time.split(':').map(Number);
  return h * 3600 + m * 60 + s;
}
export function parseRealtime(bytes: Uint8Array, s: Source) {
  const feed = gtfsRealtime.transit_realtime.FeedMessage.toObject(
    gtfsRealtime.transit_realtime.FeedMessage.decode(bytes),
    { longs: String },
  );
  if (feed.header?.incrementality === 1)
    throw new Error('Differential GTFS-RT requires a dedicated incremental connector');
  return (feed.entity || [])
    .filter((e: any) => !e.isDeleted)
    .map((e: any) => ({
      kind: 'realtime',
      id: String(e.id),
      body: {
        sourceId: s.id,
        staticSourceId: s.staticSourceId,
        timestamp: feed.header?.timestamp,
        stale:
          !feed.header?.timestamp ||
          Date.now() / 1000 - Number(feed.header.timestamp) > s.intervalSeconds * 2,
        fetchedAt: new Date().toISOString(),
        ...e,
      },
    }));
}

export function realtimeReferenceStatus(entity: any, tripIds: Set<string>) {
  const trip = entity.tripUpdate?.trip || entity.vehicle?.trip;
  if (!trip?.tripId) return 'unreferenced';
  if (tripIds.has(trip.tripId)) return 'matched';
  if ([1, 2, 6].includes(trip.scheduleRelationship)) return 'additional';
  return 'unmatched';
}
