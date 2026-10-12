import { describe, it, expect } from 'vitest';
import {
  RouteSearchSchema,
  serviceInstant,
  transitSearch,
  transitPlaces,
  transitDepartures,
} from '../src/transit-api';
import { ConfigSchema } from '../src/model';
import { journey } from '../src/journeys';
const sample = {
  date: '20261012',
  timezone: 'Asia/Tokyo',
  osm: { attribution: 'OSM' },
  coverage: { feeds: [{ feedId: 'rail', name: 'Rail' }], notices: [] },
  options: [
    {
      id: 'one',
      recommended: true,
      metrics: { walkSecs: 60, waitSecs: 120 },
      journey: {
        departureSecs: 86340,
        arrivalSecs: 90000,
        durationSecs: 3660,
        transferCount: 1,
        legs: [
          {
            kind: 'transit',
            mode: 'rail',
            routeName: 'Example',
            from: { name: 'A', platformCode: '2' },
            to: { name: 'B' },
            departureSecs: 86340,
            arrivalSecs: 90000,
          },
        ],
      },
    },
  ],
};
const input = RouteSearchSchema.parse({
  origin: { lat: 35, lon: 139 },
  destination: { lat: 36, lon: 140 },
  dateTime: '2026-10-12T10:00:00+09:00',
  searchType: 'arrival',
  strategy: 'lowestFare',
});
describe('Transit API integration', () => {
  it('converts overnight and negative service seconds without changing the service day', () => {
    expect(serviceInstant('20261012', 90000, 'Asia/Tokyo')).toBe('2026-10-12T16:00:00.000Z');
    expect(serviceInstant('20261012', -60, 'Asia/Tokyo')).toBe('2026-10-11T14:59:00.000Z');
  });
  it('sends local arrival time and preferences, retains unknown fare and boarding details', async () => {
    const fetcher = async (u: string | URL | Request) => {
      const url = new URL(String(u));
      expect(url.origin).toBe('https://api.transit.ls8h.com');
      expect(url.searchParams.get('time')).toBe('10:00');
      expect(url.searchParams.get('type')).toBe('arrival');
      expect(url.searchParams.get('strategy')).toBe('lowestFare');
      return Response.json(sample);
    };
    const r = await transitSearch(input, fetcher as typeof fetch);
    expect(r.itineraries[0].fare).toBeUndefined();
    expect(r.itineraries[0].legs[0].from.platformCode).toBe('2');
    expect(r.itineraries[0].end).toBe('2026-10-12T16:00:00.000Z');
  });
  it('accepts extra upstream comparison candidates and displays six', async () => {
    const r = await transitSearch(input, (async () =>
      Response.json({
        ...sample,
        options: Array.from({ length: 7 }, (_, i) => ({ ...sample.options[0], id: String(i) })),
      })) as typeof fetch);
    expect(r.itineraries).toHaveLength(6);
  });
  it('includes access and egress walks in the displayed journey', async () => {
    const o = sample.options[0];
    const r = await transitSearch(input, (async () =>
      Response.json({
        ...sample,
        options: [
          {
            ...o,
            journey: {
              ...o.journey,
              accessWalkSecs: 60,
              egressWalkSecs: 120,
              legs: [{ ...o.journey.legs[0], arrivalSecs: 89880 }],
            },
          },
        ],
      })) as typeof fetch);
    expect(r.itineraries[0].legs.map((l) => l.mode)).toEqual(['WALK', 'rail', 'WALK']);
    expect(r.itineraries[0].duration).toBe(3720);
    expect(r.itineraries[0].start).toBe('2026-10-12T14:58:00.000Z');
    expect(r.itineraries[0].legs[2].endTime).toBe(r.itineraries[0].end);
  });
  it('uses the full service day for first and last searches', async () => {
    for (const [searchType, time] of [
      ['first', '00:00'],
      ['last', '23:59'],
    ] as const) {
      await transitSearch({ ...input, searchType }, (async (u) => {
        expect(new URL(String(u)).searchParams.get('time')).toBe(time);
        return Response.json(sample);
      }) as typeof fetch);
    }
  });
  it('ranks by complete walking-inclusive duration and never calls missing fare free', async () => {
    const base = sample.options[0];
    const r = await transitSearch({ ...input, strategy: 'fastest' }, (async () =>
      Response.json({
        ...sample,
        options: [
          { ...base, id: 'long', journey: { ...base.journey, accessWalkSecs: 600 } },
          { ...base, id: 'short' },
        ],
      })) as typeof fetch);
    expect(r.itineraries[0].id).toBe('short');
    const fares = await transitSearch({ ...input, strategy: 'lowestFare' }, (async () =>
      Response.json({
        ...sample,
        options: [
          base,
          {
            ...base,
            id: 'known',
            metrics: { ...base.metrics, fare: { currency: 'JPY', ticket: 250 } },
          },
        ],
      })) as typeof fetch);
    expect(fares.itineraries[0].id).toBe('known');
    expect(fares.itineraries[1].fare).toBeUndefined();
  });
  it('warns about expired timetable data even when the upstream omits a notice', async () => {
    const r = await transitSearch(input, (async () =>
      Response.json({
        ...sample,
        coverage: { ...sample.coverage, feeds: [{ feedId: 'old', name: 'Old feed', stale: true }] },
      })) as typeof fetch);
    expect(r.coverage.notices).toContainEqual(
      expect.objectContaining({ code: 'staleFeedData', severity: 'warning' }),
    );
  });
  it('reads boarding-station timetables without losing overnight times', async () => {
    const result = await transitDepartures('feed:Tokyo', '2026-10-12T00:00:00Z', (async (u) => {
      const url = new URL(String(u));
      expect(url.pathname).toContain('feed%3ATokyo');
      expect(url.searchParams.get('time')).toBe('09:00:00');
      return Response.json({
        date: '20261012',
        timezone: 'Asia/Tokyo',
        departures: [{ routeName: 'Line', departureSecs: 90000, headwayBased: false }],
      });
    }) as typeof fetch);
    expect(result.departures[0].departureTime).toBe('2026-10-12T16:00:00.000Z');
  });
  it('does not invent routes for empty results', async () => {
    const r = await transitSearch(input, (async () =>
      Response.json({ ...sample, options: [] })) as typeof fetch);
    expect(r.itineraries).toEqual([]);
  });
  it('rejects invalid coordinates, same endpoints, malformed results and HTTP failures', async () => {
    expect(() =>
      RouteSearchSchema.parse({ ...input, destination: { lat: 100, lon: 140 } }),
    ).toThrow();
    await expect(transitSearch({ ...input, destination: input.origin })).rejects.toThrow('出発地');
    await expect(
      transitSearch(input, (async () => Response.json({ options: [] })) as typeof fetch),
    ).rejects.toThrow();
    await expect(
      transitSearch(input, (async () => new Response('', { status: 429 })) as typeof fetch),
    ).rejects.toThrow('429');
  });
  it('normalizes remote place suggestions', async () => {
    expect(
      await transitPlaces('東京', (async () =>
        Response.json({
          places: [{ name: '東京駅', lat: 35, lon: 139, description: '駅' }],
        })) as typeof fetch),
    ).toEqual([{ name: '東京駅', lat: 35, lon: 139, address: '駅' }]);
  });
  it('also serves event arrival and return queries through the new provider', async () => {
    const cfg = ConfigSchema.parse({
      version: 1,
      name: 'Test',
      region: 'JP',
      contact: '',
      features: { activities: true, transit: true, accommodations: false, commerce: false },
      sources: [],
      journey: { provider: 'transit-api' },
    });
    const event = {
      online: false,
      place: { lat: 36, lon: 140 },
      start: '2026-10-12T10:00:00+09:00',
      end: '2026-10-12T12:00:00+09:00',
    };
    await journey(
      cfg,
      {} as any,
      event as any,
      { origin: { lat: 35, lon: 139 }, direction: 'outbound', bufferMinutes: 15 },
      (async (u) => {
        const q = new URL(String(u)).searchParams;
        expect(q.get('type')).toBe('arrival');
        expect(q.get('time')).toBe('09:45');
        return Response.json(sample);
      }) as typeof fetch,
    );
    await journey(
      cfg,
      {} as any,
      event as any,
      { origin: { lat: 35, lon: 139 }, direction: 'return', bufferMinutes: 15 },
      (async (u) => {
        const q = new URL(String(u)).searchParams;
        expect(q.get('type')).toBe('departure');
        expect(q.get('from')).toBe('geo:36,140');
        expect(q.get('to')).toBe('geo:35,139');
        return Response.json(sample);
      }) as typeof fetch,
    );
  });
});
