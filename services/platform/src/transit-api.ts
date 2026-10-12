import { z } from 'zod';
import { json } from './http';
export const TRANSIT_API = 'https://api.transit.ls8h.com';
const point = z.object({
  name: z.string(),
  id: z.string().optional(),
  platformCode: z.string().optional(),
});
const leg = z.object({
  kind: z.enum(['walk', 'transit']),
  from: point,
  to: point,
  departureSecs: z.number().finite(),
  arrivalSecs: z.number().finite(),
  mode: z.string().optional(),
  routeName: z.string().optional(),
  trainType: z.string().optional(),
  headsign: z.string().optional(),
  headwayBased: z.boolean().optional(),
});
const fare = z.object({
  currency: z.string(),
  ticket: z.number().nonnegative(),
  ic: z.number().nonnegative().optional(),
});
const coordinate = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});
const map = z.object({
  points: z
    .array(coordinate.extend({ id: z.string(), name: z.string(), purpose: z.string().optional() }))
    .max(500),
  segments: z
    .array(
      z.object({
        kind: z.enum(['walk', 'transit']),
        routeName: z.string().optional(),
        geometrySource: z.string(),
        polyline: z.array(coordinate).max(100000),
      }),
    )
    .max(100),
});
const responseSchema = z.object({
  date: z.string().regex(/^\d{8}$/),
  timezone: z.string(),
  osm: z.object({ attribution: z.string().optional() }),
  coverage: z.object({
    feeds: z.array(
      z.object({ feedId: z.string(), name: z.string(), stale: z.boolean().optional() }),
    ),
    notices: z.array(z.object({ message: z.string(), severity: z.string(), code: z.string() })),
  }),
  options: z
    .array(
      z.object({
        id: z.string(),
        recommended: z.boolean(),
        metrics: z.object({ walkSecs: z.number(), waitSecs: z.number(), fare: fare.optional() }),
        journey: z.object({
          departureSecs: z.number(),
          arrivalSecs: z.number(),
          durationSecs: z.number(),
          accessWalkSecs: z.number().nonnegative().optional(),
          egressWalkSecs: z.number().nonnegative().optional(),
          transferCount: z.number(),
          fare: fare.optional(),
          legs: z.array(leg),
        }),
        map: map.optional(),
      }),
    )
    .max(32),
});
export const RouteSearchSchema = z.object({
  origin: coordinate.extend({ name: z.string().max(120).optional() }),
  destination: coordinate.extend({ name: z.string().max(120).optional() }),
  dateTime: z.string().datetime({ offset: true }),
  searchType: z.enum(['departure', 'arrival', 'first', 'last']).default('departure'),
  strategy: z
    .enum(['balanced', 'fastest', 'fewestTransfers', 'lowestFare', 'shortestWalk'])
    .default('balanced'),
  maxTransfers: z.number().int().min(0).max(8).default(3),
  avoidWalk: z.boolean().default(false),
});
export type RouteSearch = z.infer<typeof RouteSearchSchema>;
/** Service-date seconds can cross midnight in either direction. */
export function serviceInstant(date: string, seconds: number, timezone: string) {
  const midnight = Date.UTC(
    Number(date.slice(0, 4)),
    Number(date.slice(4, 6)) - 1,
    Number(date.slice(6, 8)),
  );
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  let epoch = midnight;
  for (let i = 0; i < 3; i++) {
    const parts = Object.fromEntries(formatter.formatToParts(epoch).map((p) => [p.type, p.value]));
    const local = Date.UTC(
      +parts.year,
      +parts.month - 1,
      +parts.day,
      +parts.hour,
      +parts.minute,
      +parts.second,
    );
    epoch += midnight - local;
  }
  return new Date(epoch + seconds * 1000).toISOString();
}
export async function transitSearch(input: RouteSearch, fetcher: typeof fetch = fetch) {
  if (input.origin.lat === input.destination.lat && input.origin.lon === input.destination.lon)
    throw new Error('出発地と目的地を別の場所にしてください');
  const local = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(input.dateTime));
  const url = new URL('/api/v1/guidance/plan', TRANSIT_API);
  url.search = new URLSearchParams({
    from: `geo:${input.origin.lat},${input.origin.lon}`,
    to: `geo:${input.destination.lat},${input.destination.lon}`,
    date: local.slice(0, 10).replaceAll('-', ''),
    time:
      input.searchType === 'first'
        ? '00:00'
        : input.searchType === 'last'
          ? '23:59'
          : local.slice(11),
    type: input.searchType,
    strategy: input.strategy,
    maxTransfers: String(input.maxTransfers),
    avoidWalk: String(input.avoidWalk),
    numItineraries: '6',
    ...(input.origin.name ? { fromLabel: input.origin.name } : {}),
    ...(input.destination.name ? { toLabel: input.destination.name } : {}),
  }).toString();
  const r = responseSchema.parse(await json(url, { signal: AbortSignal.timeout(45000) }, fetcher));
  const itineraries = r.options.map((o) => ({
    id: o.id,
    timezone: r.timezone,
    recommended: o.recommended,
    start: serviceInstant(
      r.date,
      o.journey.departureSecs - (o.journey.accessWalkSecs || 0),
      r.timezone,
    ),
    end: serviceInstant(r.date, o.journey.arrivalSecs, r.timezone),
    duration: o.journey.arrivalSecs - o.journey.departureSecs + (o.journey.accessWalkSecs || 0),
    transfers: o.journey.transferCount,
    walkSeconds: o.metrics.walkSecs,
    waitSeconds: o.metrics.waitSecs,
    fare: o.metrics.fare || o.journey.fare,
    map: o.map,
    legs: [
      ...(o.journey.accessWalkSecs && o.journey.legs.length
        ? [
            {
              kind: 'walk' as const,
              from: { name: input.origin.name || '出発地' },
              to: o.journey.legs[0].from,
              departureSecs: o.journey.departureSecs - o.journey.accessWalkSecs,
              arrivalSecs: o.journey.departureSecs,
            },
          ]
        : []),
      ...o.journey.legs,
      ...(o.journey.egressWalkSecs && o.journey.legs.length
        ? [
            {
              kind: 'walk' as const,
              from: o.journey.legs[o.journey.legs.length - 1].to,
              to: { name: input.destination.name || '目的地' },
              departureSecs: o.journey.legs[o.journey.legs.length - 1].arrivalSecs,
              arrivalSecs: o.journey.arrivalSecs,
            },
          ]
        : []),
    ].map((l) => ({
      ...l,
      mode: l.kind === 'walk' ? 'WALK' : l.mode,
      routeShortName: l.routeName,
      startTime: serviceInstant(r.date, l.departureSecs, r.timezone),
      endTime: serviceInstant(r.date, l.arrivalSecs, r.timezone),
    })),
  }));
  const metric = (route: (typeof itineraries)[number]) =>
    input.strategy === 'fastest'
      ? route.duration
      : input.strategy === 'fewestTransfers'
        ? route.transfers
        : input.strategy === 'shortestWalk'
          ? route.walkSeconds
          : (route.fare?.ticket ?? Number.MAX_SAFE_INTEGER);
  if (input.strategy !== 'balanced') {
    itineraries.sort((a, b) => metric(a) - metric(b) || a.duration - b.duration);
    for (const [i, route] of itineraries.entries())
      route.recommended = i === 0 && (input.strategy !== 'lowestFare' || !!route.fare);
  }
  const notices = r.coverage.notices.map((n) => ({
    ...n,
    message:
      n.code === 'loadedDataScope'
        ? '情報を取得できる路線から検索しています。情報がない路線は候補に含まれません。'
        : n.code === 'staleFeedData'
          ? '有効期間が過ぎた時刻表が含まれています。利用前に交通会社の最新情報を確認してください。'
          : n.message,
  }));
  if (r.coverage.feeds.some((f) => f.stale) && !notices.some((n) => n.code === 'staleFeedData'))
    notices.push({
      code: 'staleFeedData',
      severity: 'warning',
      message:
        '有効期間が過ぎた時刻表が含まれています。利用前に交通会社の最新情報を確認してください。',
    });
  return {
    provider: 'transit-api',
    from: input.origin,
    to: input.destination,
    dateTime: input.dateTime,
    search: input,
    fetchedAt: new Date().toISOString(),
    timezone: r.timezone,
    coverage: { ...r.coverage, notices },
    attribution: r.osm.attribution,
    itineraries: itineraries.slice(0, 6),
  };
}
export async function transitPlaces(q: string, fetcher: typeof fetch = fetch) {
  const url = new URL('/api/v1/places/suggest', TRANSIT_API);
  url.search = new URLSearchParams({ q, limit: '10' }).toString();
  const r = z
    .object({
      places: z
        .array(coordinate.extend({ name: z.string(), description: z.string().optional() }))
        .max(30),
    })
    .parse(await json(url, { signal: AbortSignal.timeout(45000) }, fetcher));
  return r.places.map((p) => ({ name: p.name, address: p.description, lat: p.lat, lon: p.lon }));
}

export async function transitDepartures(
  id: string,
  dateTime: string,
  fetcher: typeof fetch = fetch,
) {
  const local = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(dateTime));
  const url = new URL(`/api/v1/stations/${encodeURIComponent(id)}/departures`, TRANSIT_API);
  url.search = new URLSearchParams({
    date: local.slice(0, 10).replaceAll('-', ''),
    time: local.slice(11),
    limit: '10',
  }).toString();
  const r = z
    .object({
      date: z.string().regex(/^\d{8}$/),
      timezone: z.string(),
      departures: z
        .array(
          z.object({
            routeName: z.string(),
            headsign: z.string().optional(),
            trainType: z.string().optional(),
            departureSecs: z.number().finite(),
            headwayBased: z.boolean(),
          }),
        )
        .max(100),
    })
    .parse(await json(url, { signal: AbortSignal.timeout(45000) }, fetcher));
  return {
    fetchedAt: new Date().toISOString(),
    departures: r.departures.map((d) => ({
      ...d,
      departureTime: serviceInstant(r.date, d.departureSecs, r.timezone),
      timezone: r.timezone,
    })),
  };
}
