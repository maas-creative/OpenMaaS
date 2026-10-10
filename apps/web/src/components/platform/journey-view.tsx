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
};
const time = (v: unknown) =>
  v && Number.isFinite(new Date(v as string).getTime())
    ? new Date(v as string).toLocaleString('ja-JP')
    : '時刻情報なし';
export default function JourneyView({ route }: { route: any }) {
  if (!route) return null;
  return (
    <div className="space-y-2">
      <p>
        {time(route.start)} → {time(route.end)}
      </p>
      {Number.isFinite(route.duration) && <p>所要時間 {Math.ceil(route.duration / 60)}分</p>}
      <ol className="space-y-3">
        {route.legs?.map((l: any, i: number) => (
          <li className="border-l-2 pl-3" key={i}>
            <p className="font-medium">
              {modes[l.mode] || '移動'} {l.routeShortName || ''}
            </p>
            <p>
              {l.from?.name || '出発地点'} → {l.to?.name || '到着地点'}
            </p>
            <p className="text-sm">
              {time(l.startTime || l.start)} → {time(l.endTime || l.end)}
            </p>
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
