'use client';
import { useState } from 'react';
import { distanceKm, safeWebUrl } from '@openmaas/common/platform-display';
import PlacePicker, { type SelectedPlace } from './place-picker';
import SharedPlan from './shared-plan';
export default function NearbyTransport({
  transit,
  shared,
  departures: Departures,
  loaded,
  error,
}: {
  transit: any;
  shared: any[];
  departures: any;
  loaded: boolean;
  error: string;
}) {
  const [place, setPlace] = useState<SelectedPlace>();
  const nearby = (x: any) =>
    place &&
    Number.isFinite(Number(x.lat ?? x.stop_lat)) &&
    Number.isFinite(Number(x.lon ?? x.stop_lon)) &&
    distanceKm(place, { lat: Number(x.lat ?? x.stop_lat), lon: Number(x.lon ?? x.stop_lon) }) <= 5;
  const ports = shared
    .filter(
      (x) =>
        ['station_information', 'vehicle_status', 'free_bike_status'].includes(x.feed) && nearby(x),
    )
    .sort((a, b) => distanceKm(place!, a) - distanceKm(place!, b))
    .slice(0, 20);
  const stops = (transit?.stops || [])
    .filter(nearby)
    .sort(
      (a: any, b: any) =>
        distanceKm(place!, { lat: Number(a.stop_lat), lon: Number(a.stop_lon) }) -
        distanceKm(place!, { lat: Number(b.stop_lat), lon: Number(b.stop_lon) }),
    )
    .slice(0, 20);
  const realtime = (transit?.realtime || []).filter((x: any) =>
    stops.some((s: any) => s.sourceId === x.staticSourceId),
  );
  const realtimeUpdated = Math.max(0, ...realtime.map((x: any) => Number(x.timestamp) || 0));
  const alerts = realtime.filter(
    (x: any) =>
      x.alert &&
      !x.stale &&
      (x.alert.informedEntity || []).some(
        (e: any) =>
          e.stopId &&
          stops.some((s: any) => s.stop_id === e.stopId && s.sourceId === x.staticSourceId),
      ),
  );
  const records = shared.filter(
    (x) =>
      ports.includes(x) ||
      ports.some(
        (p) => p.station_id && p.sourceId === x.sourceId && p.station_id === x.station_id,
      ) ||
      x.feed === 'system_information',
  );
  return (
    <section className="border-t pt-5 space-y-4">
      <h2 className="text-xl font-semibold">周辺の交通</h2>
      <PlacePicker label="交通を探す地点" onSelect={setPlace} onClear={() => setPlace(undefined)} />
      {!loaded ? (
        <p role="status">
          {error
            ? '交通情報を取得できませんでした。再読み込みしてお試しください。'
            : '交通情報を読み込んでいます…'}
        </p>
      ) : !place ? (
        <p>駅や施設を選ぶと、周辺5kmの停留所とシェア交通を確認できます。</p>
      ) : (
        <>
          <h3 className="font-semibold">{place.name}周辺</h3>
          {stops.length === 0 && ports.length === 0 && (
            <p>この地点の周辺に交通情報がありません。</p>
          )}
          {realtime.length > 0 && (
            <p className="text-sm">
              運行情報：
              {realtime.some((x: any) => !x.stale) ? '更新情報あり' : '現在の情報を確認できません'}
              {realtimeUpdated > 0 && (
                <> · 最終更新：{new Date(realtimeUpdated * 1000).toLocaleString('ja-JP')}</>
              )}
            </p>
          )}
          {alerts.map((x: any) => (
            <p key={`${x.sourceId}:${x.id}`} role="status" className="border rounded p-3">
              {x.alert.headerText?.translation?.find((t: any) => t.language === 'ja')?.text ||
                x.alert.headerText?.translation?.[0]?.text ||
                '周辺の停留所に運行のお知らせがあります'}
            </p>
          ))}
          {stops.map((s: any) => (
            <details key={s.id} className="border rounded p-3">
              <summary>{s.stop_name}</summary>
              <Departures
                stopId={s.id}
                calendars={s.stop_id.startsWith('odpt.') ? transit.calendars : []}
              />
            </details>
          ))}
          {ports.map((p) => {
            const status =
              p.feed === 'station_information'
                ? shared.find(
                    (x) =>
                      x.feed === 'station_status' &&
                      x.sourceId === p.sourceId &&
                      x.station_id === p.station_id,
                  )
                : p;
            return (
              <article
                key={`${p.sourceId}:${p.station_id || p.vehicle_id || p.bike_id}`}
                className="border rounded p-3 space-y-1"
              >
                <h4>
                  {p.name || (p.feed === 'station_information' ? 'シェア交通ポート' : 'シェア車両')}
                </h4>
                {!status || status.stale ? (
                  <p>現在の空き状況を確認できません。</p>
                ) : p.feed !== 'station_information' ? (
                  <p>{p.is_reserved || p.is_disabled ? '現在利用できません' : '利用可能な車両'}</p>
                ) : (
                  <p>
                    利用可能：
                    {status.is_renting === false
                      ? '貸出停止'
                      : `${status.num_vehicles_available ?? status.num_bikes_available ?? '不明'}台`}{' '}
                    · 返却：
                    {status.is_returning === false
                      ? '返却停止'
                      : `${status.num_docks_available ?? '不明'}台`}
                  </p>
                )}
                {status?.updated && (
                  <p className="text-sm text-slate-600">
                    更新：
                    {new Date(
                      typeof status.updated === 'number' ? status.updated * 1000 : status.updated,
                    ).toLocaleString('ja-JP')}
                  </p>
                )}
                {safeWebUrl(p.rental_uris?.web) && (
                  <a className="underline" href={safeWebUrl(p.rental_uris.web)}>
                    提供元で利用する
                  </a>
                )}
              </article>
            );
          })}
          <SharedPlan records={records} />
        </>
      )}
    </section>
  );
}
