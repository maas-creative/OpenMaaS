import { activity, safeLink, secret, type Env, type Source, type RecordItem } from './model';
import { json } from './http';
export function external(url: unknown) {
  const u = safeLink(url);
  return u ? [{ type: 'external' as const, label: '提供元で申し込む', url: u }] : [];
}
export async function squareRequest(
  s: Source,
  env: Env,
  path: string,
  body?: unknown,
  fetcher: typeof fetch = fetch,
) {
  const base =
    s.params.environment === 'sandbox'
      ? 'https://connect.squareupsandbox.com'
      : 'https://connect.squareup.com';
  const result = await json(
    base + '/v2' + path,
    {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        Authorization: `Bearer ${secret(env, s.secretRef)}`,
        'Square-Version': s.params.apiVersion || '2026-09-16',
        'Content-Type': 'application/json',
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
    fetcher,
  );
  if (result.errors?.length) throw new Error('Square rejected the request');
  return result;
}
export async function loadOdpt(s: Source, env: Env, fetcher: typeof fetch) {
  const items: RecordItem[] = [];
  for (const dataset of (s.params.datasets || 'TrainInformation').split(',')) {
    const u = new URL(`https://api.odpt.org/api/v4/odpt:${dataset}`);
    u.searchParams.set('acl:consumerKey', secret(env, s.secretRef));
    for (const key of ['odpt:operator', 'odpt:railway'])
      if (s.params[key]) u.searchParams.set(key, s.params[key]);
    const rows = await json(u, {}, fetcher);
    if (!Array.isArray(rows)) throw new Error('Unexpected ODPT response');
    for (const r of rows) {
      const id = r['owl:sameAs'] || r['@id'];
      if (!id) throw new Error('Missing ODPT identity');
      if (dataset === 'Station')
        items.push({
          kind: 'odpt:stops',
          id,
          body: {
            id: `${s.id}:${id}`,
            sourceId: s.id,
            stop_id: id,
            stop_name: r['odpt:stationTitle']?.ja || r['dc:title'] || id,
            stop_lat: r['geo:lat'],
            stop_lon: r['geo:long'],
            railway: r['odpt:railway'],
          },
        });
      else if (dataset === 'TrainInformation')
        items.push({
          kind: 'realtime',
          id,
          body: {
            sourceId: s.id,
            id,
            text: r['odpt:trainInformationText'],
            time: r['dc:date'],
            fetchedAt: new Date().toISOString(),
          },
        });
      else items.push({ kind: `odpt:${dataset}`, id, body: { ...r, sourceId: s.id } });
    }
  }
  return { items };
}
export async function loadAdditional(s: Source, env: Env, fetcher: typeof fetch = fetch) {
  const rows: ReturnType<typeof activity>[] = [];
  if (s.kind === 'eventbrite') {
    let page = 1;
    while (true) {
      const u = new URL(
        `https://www.eventbriteapi.com/v3/organizations/${encodeURIComponent(s.params.organizationId || '')}/events/`,
      );
      u.searchParams.set('expand', 'venue');
      u.searchParams.set('page', String(page));
      u.searchParams.set('status', s.params.status || 'live');
      const r = await json(
        u,
        { headers: { Authorization: `Bearer ${secret(env, s.secretRef)}` } },
        fetcher,
      );
      if (!Array.isArray(r.events)) throw new Error('Unexpected Eventbrite response');
      for (const e of r.events.filter((e: any) => e.listed === true))
        rows.push(
          activity(
            s,
            e.id,
            e.name.text,
            {
              name: e.venue?.name || '',
              address: e.venue?.address?.localized_address_display,
              lat: e.venue?.latitude ? Number(e.venue.latitude) : undefined,
              lon: e.venue?.longitude ? Number(e.venue.longitude) : undefined,
            },
            {
              description: e.summary || '',
              start: e.start?.utc,
              end: e.end?.utc,
              online: !!e.online_event,
              status: e.status === 'canceled' ? 'cancelled' : 'scheduled',
              actions: external(e.url),
            },
          ),
        );
      if (!r.pagination?.has_more_items) break;
      if (++page > 50) throw new Error('Eventbrite import limit exceeded');
    }
  } else if (s.kind === 'ticketmaster') {
    for (let page = 0; page < 5; page++) {
      const u = new URL('https://app.ticketmaster.com/discovery/v2/events.json');
      for (const [k, v] of Object.entries(s.params)) u.searchParams.set(k, v);
      u.searchParams.set('apikey', secret(env, s.secretRef));
      u.searchParams.set('size', '200');
      u.searchParams.set('page', String(page));
      const r = await json(u, {}, fetcher);
      if (!r.page) throw new Error('Unexpected Ticketmaster response');
      for (const e of r._embedded?.events || []) {
        const v = e._embedded?.venues?.[0];
        rows.push(
          activity(
            s,
            e.id,
            e.name,
            {
              name: v?.name || '',
              lat: v?.location ? Number(v.location.latitude) : undefined,
              lon: v?.location ? Number(v.location.longitude) : undefined,
              address: v?.address?.line1,
            },
            {
              start: e.dates?.start?.dateTime,
              description: e.info || '',
              status: e.dates?.status?.code === 'cancelled' ? 'cancelled' : 'scheduled',
              actions: external(e.url),
              ...(e.priceRanges?.[0]
                ? {
                    price: {
                      amount: e.priceRanges[0].min,
                      currency: e.priceRanges[0].currency,
                      conditions: '提供元の参考価格',
                    },
                  }
                : {}),
            },
          ),
        );
      }
      if (page + 1 >= r.page.totalPages) break;
      if (page === 4) throw new Error('Ticketmaster deep paging limit: narrow the date or region');
    }
  } else if (s.kind === 'square') {
    const location = (
      await squareRequest(
        s,
        env,
        `/locations/${encodeURIComponent(s.params.locationId || '')}`,
        undefined,
        fetcher,
      )
    ).location;
    let cursor: string | undefined;
    do {
      const r = await squareRequest(
        s,
        env,
        `/catalog/list?types=ITEM,ITEM_VARIATION${cursor ? '&cursor=' + encodeURIComponent(cursor) : ''}`,
        undefined,
        fetcher,
      );
      for (const e of r.objects || [])
        if (
          e.type === 'ITEM' &&
          e.item_data?.product_type === 'APPOINTMENTS_SERVICE' &&
          (e.present_at_all_locations ||
            e.present_at_location_ids?.includes(s.params.locationId)) &&
          !e.absent_at_location_ids?.includes(s.params.locationId)
        ) {
          for (const v of e.item_data.variations || [])
            if (v.item_variation_data?.available_for_booking)
              rows.push(
                activity(
                  s,
                  v.id,
                  `${e.item_data.name} · ${v.item_variation_data.name}`,
                  {
                    name: location?.name || '',
                    lat: location?.coordinates?.latitude,
                    lon: location?.coordinates?.longitude,
                  },
                  {
                    category: 'facility',
                    description: e.item_data.description_plaintext || '',
                    ...(v.item_variation_data.price_money
                      ? {
                          price: {
                            amount:
                              v.item_variation_data.price_money.amount /
                              10 **
                                (new Intl.NumberFormat('en', {
                                  style: 'currency',
                                  currency: v.item_variation_data.price_money.currency,
                                }).resolvedOptions().maximumFractionDigits ?? 2),
                            currency: v.item_variation_data.price_money.currency,
                            conditions: '予約と支払は別です',
                          },
                        }
                      : {}),
                  },
                ),
              );
        }
      cursor = r.cursor;
      if (rows.length > 5000) throw new Error('Square catalog import limit');
    } while (cursor);
  } else if (s.kind === 'tomtom') {
    const u = new URL('https://api.tomtom.com/search/2/poiSearch/parking.json');
    u.searchParams.set('key', secret(env, s.secretRef));
    for (const k of ['lat', 'lon', 'radius', 'countrySet'])
      if (s.params[k]) u.searchParams.set(k, s.params[k]);
    const r = await json(u, {}, fetcher);
    const ids = s.params.parkingIds?.split(',');
    for (const p of r.results || []) {
      const parkingId = p.dataSources?.parkingAvailability?.id;
      if (ids && !ids.includes(parkingId)) continue;
      let availability;
      if (parkingId) {
        const a = new URL('https://api.tomtom.com/search/2/parkingAvailability.json');
        a.searchParams.set('key', secret(env, s.secretRef));
        a.searchParams.set('parkingAvailability', parkingId);
        availability = await json(a, {}, fetcher);
      }
      rows.push(
        activity(
          s,
          p.id,
          p.poi?.name || '駐車場',
          {
            name: p.poi?.name || '',
            address: p.address?.freeformAddress,
            lat: p.position?.lat,
            lon: p.position?.lon,
          },
          {
            category: 'parking',
            description: availability
              ? `空き情報 ${JSON.stringify(availability.parkingAvailability || availability)}`
              : '空き情報は提供されていません',
          },
        ),
      );
    }
  } else if (s.kind === 'viator') {
    for (const code of (s.params.productCodes || '').split(',').filter(Boolean)) {
      const r = await viatorRequest(
        s,
        env,
        `/products/${encodeURIComponent(code)}`,
        undefined,
        fetcher,
      );
      rows.push(
        activity(
          s,
          r.productCode,
          r.title,
          { name: r.destinations?.[0]?.destinationName || '' },
          {
            category: 'experience',
            description: r.description || '',
            actions: external(r.productUrl),
          },
        ),
      );
    }
  } else if (['uber', 'google-calendar'].includes(s.kind)) return { items: [] };
  else if (s.kind === 'booking' || s.kind === 'expedia')
    return { items: [] }; // Date-specific inventory is queried on demand.
  else throw new Error('Formal provider specification is required');
  return {
    items: rows
      .filter((a) => !s.categories.length || s.categories.includes(a.category))
      .map((body) => ({ kind: 'activity', id: body.id, body })),
  };
}
export async function viatorRequest(
  s: Source,
  env: Env,
  path: string,
  body?: unknown,
  fetcher: typeof fetch = fetch,
) {
  const base =
    s.params.environment === 'sandbox'
      ? 'https://api.sandbox.viator.com/partner'
      : 'https://api.viator.com/partner';
  return json(
    base + path,
    {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        'exp-api-key': secret(env, s.secretRef),
        Accept: 'application/json;version=2.0',
        'Accept-Language': s.params.language || 'en-US',
        'Content-Type': 'application/json',
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
    fetcher,
  );
}

export async function uberRequest(
  s: Source,
  env: Env,
  path: string,
  body?: unknown,
  method?: string,
) {
  let token = secret(env, s.secretRef);
  if (s.params.clientId) {
    const r = await json('https://auth.uber.com/oauth/v2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: s.params.clientId,
        client_secret: secret(env, s.params.clientSecretRef),
        grant_type: 'client_credentials',
        scope: 'guests.trips',
      }).toString(),
    });
    token = r.access_token;
    if (!token) throw new Error('Uber token unavailable');
  }
  const base =
    s.params.environment === 'sandbox' ? 'https://sandbox-api.uber.com' : 'https://api.uber.com';
  return json(base + '/v1/guests' + path, {
    method: method || (body === undefined ? 'GET' : 'POST'),
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(s.params.organizationId ? { 'x-uber-organizationuuid': s.params.organizationId } : {}),
      ...(s.params.sandboxRunId ? { 'x-uber-sandbox-runuuid': s.params.sandboxRunId } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
