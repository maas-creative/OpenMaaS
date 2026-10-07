import { activity, safeLink, secret, type Source, type Env, type RecordItem } from './model';
import { json } from './http';
import { connectorDefinitions } from './registry';
import { loadAdditional, loadOdpt } from './providers';
export const capabilities = Object.fromEntries(Object.entries(connectorDefinitions).map(([k,v]) => [k,v.capabilities]));
function actions(url: unknown, label = '公式サイトへ') {
  const u = safeLink(url);
  return u ? [{ type: 'external' as const, label, url: u }] : [];
}
export function normalizeLuma(s: Source, e: any) {
  const address = e.geo_address_json || {};
  const publicLocation = e.location_visibility === 'public';
  return activity(
    s,
    e.id,
    e.name,
    {
      name: publicLocation ? address.address || address.city || '' : address.city || '',
      lat: publicLocation ? e.coordinate?.latitude : undefined,
      lon: publicLocation ? e.coordinate?.longitude : undefined,
    },
    {
      description: typeof e.description_md === 'string' ? e.description_md : '',
      ...(e.display_price &&
      Number.isFinite(e.display_price.amount) &&
      typeof e.display_price.currency === 'string'
        ? {
            price: {
              amount:
                e.display_price.amount /
                10 **
                  (new Intl.NumberFormat('en', {
                    style: 'currency',
                    currency: e.display_price.currency.toUpperCase(),
                  }).resolvedOptions().maximumFractionDigits ?? 2),
              currency: e.display_price.currency.toUpperCase(),
              conditions: e.display_price.is_flexible
                ? '任意料金の目安。提供元で確認してください。'
                : '参考開始価格。最新の価格・条件は提供元で確認してください。',
            },
          }
        : {}),
      start: e.start_at,
      end: e.end_at,
      online: !['offline', 'missing'].includes(e.location_type),
      actions: actions(e.url, 'Lumaで参加する'),
    },
  );
}
export async function loadSource(
  s: Source,
  env: Env,
  fetcher: typeof fetch = fetch,
): Promise<{ items: RecordItem[]; ttl?: number }> {
  const wrap = (rows: any[]) =>
    rows
      .filter((a) => !s.categories.length || s.categories.includes(a.category))
      .map((body) => ({ kind: 'activity', id: body.id, body }));
  if (s.kind === 'manual')
    return {
      items: wrap(
        s.manual.map(({ id, url, lat, lon, ...m }) =>
          activity(s, id, m.title, { name: m.title, lat, lon }, { ...m, actions: actions(url) }),
        ),
      ),
    };
  if (s.kind === 'luma') {
    const entries: any[] = [];
    let cursor: string | undefined;
    const headers = { 'x-luma-api-key': secret(env, s.secretRef) };
    do {
      const organization = s.params.scope === 'organization';
      const u = new URL(
        `https://public-api.luma.com/v1/${organization ? 'organizations' : 'calendars'}/events/list`,
      );
      if (!organization) u.searchParams.set('access', 'manage');
      u.searchParams.set('pagination_limit', '100');
      for (const k of ['after', 'before']) if (s.params[k]) u.searchParams.set(k, s.params[k]);
      if (cursor) u.searchParams.set('pagination_cursor', cursor);
      const r = await json(u, { headers }, fetcher);
      entries.push(...r.entries);
      cursor = r.has_more ? r.next_cursor : undefined;
      if (r.has_more && !cursor) throw new Error('Missing pagination cursor');
      if (entries.length > 5000) throw new Error('Calendar exceeds import limit');
    } while (cursor);
    return {
      items: wrap(
        entries
          .filter(
            (e) =>
              e.visibility === 'public' &&
              (!s.params.calendarIds || s.params.calendarIds.split(',').includes(e.calendar_id)),
          )
          .map((e) => normalizeLuma(s, e)),
      ),
    };
  }
  if (s.kind === 'connpass') {
    const rows: any[] = [];
    let start = 1;
    let total = 0;
    do {
      const u = new URL('https://connpass.com/api/v2/events/');
      for (const [k, v] of Object.entries(s.params)) u.searchParams.set(k, v);
      u.searchParams.set('start', String(start));
      u.searchParams.set('count', '100');
      const r = await json(u, { headers: { 'X-API-Key': secret(env, s.secretRef) } }, fetcher);
      rows.push(...r.events);
      total = r.results_available;
      start += r.events.length;
      if (!r.events.length) break;
      if (start <= total) await new Promise((r) => setTimeout(r, 1100));
      if (rows.length > 5000) throw new Error('Event result exceeds import limit');
    } while (start <= total);
    return {
      items: wrap(
        rows.map((e) =>
          activity(
            s,
            String(e.event_id),
            e.title,
            {
              name: e.place || '',
              address: e.address,
              lat: e.lat === null ? undefined : Number(e.lat),
              lon: e.lon === null ? undefined : Number(e.lon),
            },
            {
              description: e.catch || '',
              start: e.started_at,
              end: e.ended_at,
              online: e.lat === null && e.lon === null && /オンライン|online/i.test(e.place || ''),
              actions: actions(e.event_url, 'connpassで参加する'),
            },
          ),
        ),
      ),
    };
  }
  if (s.kind === 'rakuten') {
    const vacancy = !!s.params.checkinDate;
    const u = new URL(
      `https://openapi.rakuten.co.jp/engine/api/Travel/${vacancy ? 'VacantHotelSearch/20170426' : 'SimpleHotelSearch/20260731'}`,
    );
    for (const [k, v] of Object.entries(s.params)) u.searchParams.set(k, v);
    u.searchParams.set('format', 'json');
    u.searchParams.set('datumType', '1');
    const r = await json(u, { headers: { accessKey: secret(env, s.secretRef) } }, fetcher);
    const rows = (r.hotels || []).map((item: any) => {
      const parts = item.hotel || item;
      const h = Array.isArray(parts) ? Object.assign({}, ...parts) : parts;
      const b = h.hotelBasicInfo || h;
      return activity(
        s,
        String(b.hotelNo),
        b.hotelName,
        {
          name: b.hotelName,
          address: `${b.address1 || ''}${b.address2 || ''}`,
          lat: Number(b.latitude),
          lon: Number(b.longitude),
        },
        {
          category: 'accommodation',
          description: b.hotelSpecial || '',
          ...(Number(b.hotelMinCharge) > 0
            ? {
                price: {
                  amount: Number(b.hotelMinCharge),
                  currency: 'JPY',
                  conditions: '参考最低料金。人数・プラン・空室条件によって変わります。',
                },
              }
            : {}),
          actions: actions(b.planListUrl || b.hotelInformationUrl, '楽天トラベルで確認する'),
        },
      );
    });
    return { items: wrap(rows) };
  }
  if (s.kind === 'odpt') return loadOdpt(s, env, fetcher);
  if (s.kind === 'gbfs') return loadGbfs(s, fetcher);
  return loadAdditional(s, env, fetcher);
}
export async function loadGbfs(s: Source, fetcher: typeof fetch) {
  const root = await json(s.url!, {}, fetcher);
  if (!['2.3', '3.0'].includes(root.version)) throw new Error('Supported GBFS versions: 2.3, 3.0');
  const data = root.data;
  const feeds = data.feeds || data[Object.keys(data)[0]]?.feeds;
  if (!feeds) throw new Error('GBFS discovery missing feeds');
  const names = [
    'system_information',
    'station_information',
    'station_status',
    'vehicle_status',
    'free_bike_status',
    'system_pricing_plans',
  ];
  const items: RecordItem[] = [];
  let ttl = Math.max(60, root.ttl || 60);
  for (const name of names) {
    const feed = feeds.find((f: any) => f.name === name);
    if (!feed) continue;
    const r = await json(feed.url, {}, fetcher);
    ttl = Math.min(ttl, Math.max(60, r.ttl || 60));
    const rows = r.data.stations || r.data.vehicles || r.data.bikes || r.data.plans || [r.data];
    for (const [i, body] of rows.entries())
      items.push({
        kind: 'shared-mobility',
        id: `${name}:${body.station_id || body.vehicle_id || body.bike_id || body.plan_id || i}`,
        body: {
          ...body,
          sourceId: s.id,
          feed: name,
          version: r.version,
          updated: r.last_updated,
          ttl: r.ttl,
          stale:
            Date.now() / 1000 -
              (typeof r.last_updated === 'number'
                ? r.last_updated
                : Date.parse(r.last_updated) / 1000) >
            Math.max(60, r.ttl || 60) * 2,
          fetchedAt: new Date().toISOString(),
          ...(Array.isArray(body.name)
            ? {
                name:
                  (
                    body.name.find((n: any) => n.language === (s.params.language || 'ja')) ||
                    body.name[0]
                  )?.text || '',
              }
            : {}),
        },
      });
  }
  return { items, ttl };
}
