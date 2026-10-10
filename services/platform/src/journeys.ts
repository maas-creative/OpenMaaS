import { z } from 'zod';
import type { Activity, Config, Env } from './model';
import { secret } from './model';
import { json } from './http';
export const JourneySchema = z.object({
  activityId: z.string().optional(),
  direction: z.enum(['outbound', 'return']),
  origin: z.object({ lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180) }),
  dateTime: z.string().datetime({ offset: true }).optional(),
  bufferMinutes: z.number().int().min(0).max(240).default(15),
});
export function timing(
  a: Activity,
  direction: 'outbound' | 'return',
  explicit?: string,
  buffer = 15,
) {
  if (a.online) throw new Error('Online activity does not require travel');
  if (!Number.isFinite(a.place.lat) || !Number.isFinite(a.place.lon))
    throw new Error('Venue coordinates are missing');
  const base = explicit || (direction === 'outbound' ? a.receptionStart || a.start : a.end);
  if (!base) throw new Error('Specify travel date and time');
  return {
    dateTime: new Date(
      new Date(base).getTime() -
        (direction === 'outbound' && !explicit && !a.receptionStart ? buffer * 60000 : 0),
    ).toISOString(),
    arriveBy: direction === 'outbound',
  };
}
export async function journey(
  cfg: Config,
  env: Env,
  a: Activity,
  input: z.infer<typeof JourneySchema>,
  fetcher: typeof fetch = fetch,
) {
  const t = timing(a, input.direction, input.dateTime, input.bufferMinutes);
  const venue = { lat: a.place.lat!, lon: a.place.lon! },
    from = input.direction === 'outbound' ? input.origin : venue,
    to = input.direction === 'outbound' ? venue : input.origin;
  if (cfg.journey.provider === 'none') throw new Error('Journey provider is not configured');
  const date = new Date(t.dateTime);
  if (cfg.journey.provider === 'otp') {
    const query = `query($origin:PlanLabeledLocationInput!,$destination:PlanLabeledLocationInput!,$dateTime:PlanDateTimeInput!){planConnection(origin:$origin,destination:$destination,dateTime:$dateTime,first:5){edges{node{start end duration legs{mode startTime endTime from{name} to{name} route{shortName}}}}}}`;
    const coordinate = (p: { lat: number; lon: number }) => ({
      location: { coordinate: { latitude: p.lat, longitude: p.lon } },
    });
    const result = await json(
      cfg.journey.url!,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          variables: {
            origin: coordinate(from),
            destination: coordinate(to),
            dateTime: { [t.arriveBy ? 'latestArrival' : 'earliestDeparture']: t.dateTime },
          },
        }),
      },
      fetcher,
    );
    if (result.errors) throw new Error('Journey planner rejected the query');
    return {
      provider: 'otp',
      ...t,
      from,
      to,
      itineraries: (result.data?.planConnection?.edges || []).map((e: any) => ({
        ...e.node,
        legs: e.node.legs.map((l: any) => ({ ...l, routeShortName: l.route?.shortName })),
      })),
    };
  }
  const local = new Intl.DateTimeFormat('sv-SE', {
    timeZone: cfg.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
  const u = new URL('https://api.ekispert.jp/v1/json/search/course/extreme');
  u.search = new URLSearchParams({
    key: secret(env, cfg.journey.secretRef),
    viaList: `${from.lat},${from.lon},wgs84:${to.lat},${to.lon},wgs84`,
    date: local.slice(0, 10).replaceAll('-', ''),
    time: local.slice(11).replace(':', ''),
    searchType: t.arriveBy ? 'arrival' : 'departure',
  }).toString();
  const result = await json(u, {}, fetcher);
  if (result.ResultSet?.Error) throw new Error('Journey planner could not find a route');
  const courses = Array.isArray(result.ResultSet?.Course)
    ? result.ResultSet.Course
    : result.ResultSet?.Course
      ? [result.ResultSet.Course]
      : [];
  const array = (v: any) => (Array.isArray(v) ? v : v ? [v] : []);
  return {
    provider: 'ekispert',
    ...t,
    from,
    to,
    itineraries: courses.map((course: any) => {
      const lines = array(course.Route?.Line),
        points = array(course.Route?.Point);
      return {
        start: lines[0]?.DepartureState?.Datetime?.text,
        end: lines.at(-1)?.ArrivalState?.Datetime?.text,
        legs: lines.map((l: any, i: number) => ({
          mode: typeof l.Type === 'string' ? l.Type : l.Type?.text || 'TRANSIT',
          routeShortName: l.Name,
          startTime: l.DepartureState?.Datetime?.text,
          endTime: l.ArrivalState?.Datetime?.text,
          from: { name: points[i]?.Station?.Name || points[i]?.Name || '' },
          to: { name: points[i + 1]?.Station?.Name || points[i + 1]?.Name || '' },
        })),
      };
    }),
  };
}
