'use client';
import { useState } from 'react';
import RouteMap from './route-map';
import StationDepartures from './station-departures';
import { safeWebUrl } from '@openmaas/common/platform-display';
const modes: Record<string, string> = {
  WALK: '徒歩',
  walk: '徒歩',
  BICYCLE: '自転車',
  BUS: 'バス',
  bus: 'バス',
  RAIL: '鉄道',
  rail: '鉄道',
  SUBWAY: '地下鉄',
  TRAM: '路面電車',
  FERRY: '船',
  CAR: '自動車',
  TRANSIT: '公共交通',
  train: '鉄道',
  subway: '地下鉄',
  tram: '路面電車',
  ferry: '船',
  monorail: 'モノレール',
  cableTram: 'ケーブルカー',
  aerialLift: 'ロープウェイ',
  funicular: 'ケーブルカー',
  trolleybus: 'トロリーバス',
  air: '飛行機',
};
const time = (v: unknown, timeZone?: string) => {
  if (!v || !Number.isFinite(new Date(v as string).getTime())) return '時刻情報なし';
  try {
    return new Date(v as string).toLocaleString('ja-JP', {
      timeZone,
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return new Date(v as string).toLocaleString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
};
export default function JourneyView({ route }: { route: any }) {
  const [showMap, setShowMap] = useState(false);
  if (!route) return null;
  const showTime = (value: unknown) => time(value, route.timezone);
  return (
    <div className="maas-journey rounded-xl border bg-white p-5 space-y-3">
      <h3 className="text-lg font-semibold">経路の詳細</h3>
      <p className="text-sm text-slate-600">
        {showTime(route.start)} → {showTime(route.end)}
      </p>
      {Number.isFinite(route.duration) && <p>所要時間 {Math.ceil(route.duration / 60)}分</p>}
      {route.map && (
        <>
          <button
            className="underline"
            type="button"
            aria-expanded={showMap}
            onClick={() => setShowMap(!showMap)}
          >
            {showMap ? '地図を閉じる' : '地図で乗り場と道順を見る'}
          </button>
          {showMap && <RouteMap data={route.map} />}
        </>
      )}
      {route.transfers !== undefined && (
        <p>
          乗換 {route.transfers}回・徒歩 {Math.ceil((route.walkSeconds || 0) / 60)}分
        </p>
      )}
      {route.waitSeconds > 0 && <p>待ち時間 {Math.ceil(route.waitSeconds / 60)}分</p>}
      {route.fare && (
        <p>
          きっぷ運賃 {route.fare.ticket.toLocaleString()} {route.fare.currency}
          {route.fare.ic !== undefined && (
            <>
              {' '}
              / ICカード運賃 {route.fare.ic.toLocaleString()} {route.fare.currency}
            </>
          )}
        </p>
      )}
      <ol className="maas-route-steps">
        {route.legs?.map((l: any, i: number) => (
          <li className="relative border-l-2 pl-5 pb-5" key={i}>
            <span className="maas-step-number" aria-hidden="true">
              {i + 1}
            </span>
            <p className="font-medium">
              {modes[l.mode] || '移動'} {l.routeShortName || ''}
            </p>
            <p>
              {l.from?.name || '出発地点'}{' '}
              {l.from?.platformCode ? `（乗り場：${l.from.platformCode}）` : ''} →{' '}
              {l.to?.name || '到着地点'}
            </p>
            {l.headsign && (
              <p>
                行き先：{l.headsign} {l.trainType || ''}
              </p>
            )}
            {l.headwayBased && <p>一定間隔で運行する便の目安時刻です。</p>}
            <p className="text-sm">
              {showTime(l.startTime || l.start)} → {showTime(l.endTime || l.end)}
            </p>
            {route.timezone && l.mode !== 'WALK' && l.mode !== 'walk' && l.from?.id && (
              <StationDepartures
                key={`${l.from.id}:${l.startTime}`}
                id={l.from.id}
                name={l.from.name}
                dateTime={l.startTime}
              />
            )}
          </li>
        ))}
      </ol>
      {!route.legs?.length && <p>区間の詳細を取得できませんでした。別の経路を検索してください。</p>}
      {safeWebUrl(route.url) && (
        <a className="underline" href={safeWebUrl(route.url)}>
          提供元の経路詳細
        </a>
      )}
    </div>
  );
}
