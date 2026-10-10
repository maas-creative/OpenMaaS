import { boundedBody } from './http';
import { Hono } from 'hono';
import { z } from 'zod';
import { type AppEnv, hash } from './auth';
import { config } from './store';
import { activity, secret, type Env, type Source } from './model';
import { external, viatorRequest } from './providers';
import { json, request } from './http';
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(v + 'T00:00:00Z');
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v;
  });
export const stayQuery = z
  .object({ checkin: date, checkout: date, adults: z.number().int().min(1).max(8).default(1) })
  .strict()
  .refine((v) => v.checkout > v.checkin, 'Check-out must be after check-in');
export async function bookingRequest(s: Source, env: Env, path: string, body: unknown) {
  const base =
    s.params.environment === 'sandbox'
      ? 'https://demandapi-sandbox.booking.com/3.2'
      : 'https://demandapi.booking.com/3.2';
  return json(base + path, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret(env, s.secretRef)}`,
      'X-Affiliate-Id': s.params.affiliateId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}
export async function expediaRequest(
  s: Source,
  env: Env,
  path: string,
  body?: unknown,
  method?: string,
  customerIp = '127.0.0.1',
): Promise<any> {
  const key = secret(env, s.secretRef),
    shared = secret(env, s.secretRef + '_SHARED'),
    timestamp = Math.floor(Date.now() / 1000);
  const signature = Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-512', new TextEncoder().encode(key + shared + timestamp)),
    ),
  )
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('');
  const base = s.params.environment === 'sandbox' ? 'https://test.ean.com' : 'https://api.ean.com';
  // Provider-returned link paths are accepted only on the fixed API host.
  const u = new URL(path, base);
  if (u.origin !== base || !u.pathname.startsWith('/v3/'))
    throw new Error('Untrusted Expedia link');
  const response = await request(u, {
    method: method || (body === undefined ? 'GET' : 'POST'),
    headers: {
      Authorization: `EAN APIKey=${key},Signature=${signature},timestamp=${timestamp}`,
      Accept: 'application/json',
      'Accept-Encoding': 'gzip',
      'Content-Type': 'application/json',
      'Customer-Ip': customerIp,
      'User-Agent': 'OpenMaaS/0.1',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return response.status === 204 || response.status === 202
    ? {}
    : JSON.parse(new TextDecoder().decode(await boundedBody(response)));
}
export const inventory = new Hono<AppEnv>();
inventory.post('/services/search', async (c) => {
  const dto = z
    .object({ sourceId: z.string(), query: z.record(z.unknown()) })
    .strict()
    .parse(await c.req.json());
  const cfg = await config(c.env),
    s = cfg.sources.find((s) => s.id === dto.sourceId && s.enabled);
  if (!s) return c.json({ error: 'Source not enabled' }, 404);
  const key = await hash(JSON.stringify(dto));
  let rows: any[] = [];
  if (s.kind === 'booking') {
    if (!cfg.features.accommodations) return c.json({ error: 'Accommodations disabled' }, 404);
    const q = stayQuery.parse(dto.query);
    const r = await bookingRequest(s, c.env, '/accommodations/search', {
      checkin: q.checkin,
      checkout: q.checkout,
      guests: { number_of_adults: q.adults, number_of_rooms: 1 },
      booker: { country: s.params.bookerCountry, platform: s.params.platform || 'desktop' },
      ...(s.params.accommodationIds
        ? { accommodations: s.params.accommodationIds.split(',').map(Number) }
        : s.params.city
          ? { city: Number(s.params.city) }
          : { country: s.params.country }),
      extras: ['products'],
    });
    const ids = r.data.map((p: any) => p.id);
    const details = ids.length
      ? await bookingRequest(s, c.env, '/accommodations/details', {
          accommodations: ids,
          languages: ['ja', 'en-gb'],
          extras: ['description'],
        })
      : { data: [] };
    rows = r.data.map((p: any) => {
      const d = details.data.find((d: any) => d.id === p.id) || p;
      return activity(
        s,
        String(p.id),
        d.name?.ja || d.name?.['en-gb'] || '宿泊施設',
        {
          name: d.name?.ja || d.name?.['en-gb'] || '',
          lat: d.location?.latitude,
          lon: d.location?.longitude,
        },
        {
          category: 'accommodation',
          description: d.description?.['en-gb'] || '',
          actions: external(p.url || d.url),
          bookingWindow: { checkinDate: q.checkin, checkoutDate: q.checkout, adults: q.adults },
          bookableOptions: (p.products || []).map((v: any, index: number) => ({
            id: v.id,
            label: typeof v.name === 'string' ? v.name : `宿泊プラン ${index + 1}`,
            query: {
              accommodationId: p.id,
              productId: v.id,
              checkin: q.checkin,
              checkout: q.checkout,
              adults: q.adults,
            },
          })),
        } as any,
      );
    });
  } else if (s.kind === 'expedia') {
    if (!cfg.features.accommodations) return c.json({ error: 'Accommodations disabled' }, 404);
    const q = stayQuery.parse(dto.query),
      u = new URL('https://api.ean.com/v3/properties/availability');
    for (const [k, v] of Object.entries({
      checkin: q.checkin,
      checkout: q.checkout,
      occupancy: String(q.adults),
      currency: s.params.currency,
      country_code: s.params.countryCode,
      language: s.params.language,
      sales_channel: s.params.salesChannel,
      sales_environment: s.params.salesEnvironment,
    }))
      u.searchParams.set(k, v);
    for (const id of s.params.propertyIds.split(',')) u.searchParams.append('property_id', id);
    const r = await expediaRequest(
      s,
      c.env,
      u.pathname + u.search,
      undefined,
      undefined,
      c.req.header('CF-Connecting-IP') || '127.0.0.1',
    );
    const content = new URL('https://api.ean.com/v3/properties/content');
    content.searchParams.set('language', s.params.language);
    for (const id of s.params.propertyIds.split(','))
      content.searchParams.append('property_id', id);
    const descriptions = await expediaRequest(s, c.env, content.pathname + content.search);
    rows = r.map((p: any) => {
      const d = descriptions[p.property_id] || {};
      return activity(
        s,
        p.property_id,
        d.name || '宿泊施設',
        {
          name: d.name || '',
          lat: d.location?.coordinates?.latitude,
          lon: d.location?.coordinates?.longitude,
        },
        {
          category: 'accommodation',
          description: '空室・料金は予約前に再確認します。',
          bookingWindow: { checkinDate: q.checkin, checkoutDate: q.checkout, adults: q.adults },
          bookableOptions: (p.rooms || []).flatMap((room: any) =>
            (room.rates || []).map((rate: any, index: number) => ({
              id: rate.id,
              label: `${room.room_name || d.rooms?.[room.id]?.name || '客室'} · プラン ${index + 1}`,
              query: {
                propertyId: p.property_id,
                roomId: room.id,
                rateId: rate.id,
                checkin: q.checkin,
                checkout: q.checkout,
                adults: q.adults,
              },
            })),
          ),
        } as any,
      );
    });
  } else if (s.kind === 'viator') {
    const q = z
      .object({
        productCode: z.string(),
        travelDate: date,
        adults: z.number().int().min(1).max(20),
      })
      .strict()
      .parse(dto.query);
    if (!s.params.productCodes.split(',').includes(q.productCode))
      return c.json({ error: 'Product outside configured range' }, 403);
    const r = await viatorRequest(s, c.env, '/availability/check', {
      productCode: q.productCode,
      travelDate: q.travelDate,
      currency: s.params.currency || 'USD',
      paxMix: [{ ageBand: 'ADULT', numberOfTravelers: q.adults }],
    });
    return c.json({
      sourceId: s.id,
      productCode: q.productCode,
      date: q.travelDate,
      currency: r.currency,
      items: r.bookableItems?.map((b: any) => ({
        available: b.available,
        productOptionCode: b.productOptionCode,
        startTime: b.startTime,
        price: b.totalPrice,
      })),
      reservationConfirmed: false,
    });
  } else
    return c.json({ error: 'Use this provider’s activity search or booking availability' }, 422);
  rows = rows.map((a) => ({ ...a, id: a.id + '@' + key.slice(0, 12) }));
  await c.env.DB.prepare('INSERT OR REPLACE INTO search_cache VALUES(?,?,?,?)')
    .bind(key, s.id, JSON.stringify(rows), Date.now() + Math.min(s.intervalSeconds, 300) * 1000)
    .run();
  return c.json(rows);
});
