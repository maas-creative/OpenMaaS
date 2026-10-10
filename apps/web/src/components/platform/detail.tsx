'use client';
import { useEffect, useState } from 'react';
import { platform, type Activity } from '@/lib/platform';
import PlacePicker from './place-picker';
import JourneyView from './journey-view';
import { ErrorMessage, Loading } from './shell';
export default function Detail({ id }: { id: string }) {
  const [a, setA] = useState<Activity>();
  const [sourceLabel, setSourceLabel] = useState('');
  const [originName, setOriginName] = useState('');
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const [lat, setLat] = useState(''),
    [lon, setLon] = useState(''),
    [buffer, setBuffer] = useState(15),
    [returnTime, setReturnTime] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [results, setResults] = useState<Record<string, any>>({});
  const [external, setExternal] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState('');
  useEffect(() => {
    platform<any>('/auth/session')
      .then((s) => (s.authenticated ? platform<any[]>('/plans') : []))
      .then(setPlans)
      .catch(() => {});
    let active = true;
    platform<{ id: string }[]>('/service-connections')
      .then((rows) => {
        if (active) setServiceIds(rows.map((r) => r.id));
      })
      .catch(() => {});
    platform<any[]>('/sources')
      .then((rows) =>
        setSourceLabel(rows.find((s) => s.id === id.split(':')[0])?.label || '情報の提供元'),
      )
      .catch(() => {});
    platform<Activity>(`/activities/${encodeURIComponent(id)}`)
      .then((r) => {
        if (active) setA(r);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [id]);
  async function route(direction: 'outbound' | 'return') {
    setError('');
    try {
      if (!lat || !lon) throw new Error('出発地を選択してください');
      if (direction === 'return' && !a?.end && !returnTime)
        throw new Error('帰路の日時を入力してください');
      const r = await platform<any>('/journeys', {
        method: 'POST',
        body: JSON.stringify({
          activityId: id,
          direction,
          origin: { lat: Number(lat), lon: Number(lon) },
          bufferMinutes: buffer,
          ...(direction === 'outbound' && !a?.start && arrivalTime
            ? { dateTime: new Date(arrivalTime).toISOString() }
            : {}),
          ...(direction === 'return' && returnTime
            ? { dateTime: new Date(returnTime).toISOString() }
            : {}),
        }),
      });
      setResults((old) => ({ ...old, [direction]: { ...r, selected: 0 } }));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function save() {
    try {
      const previous = plans.find((p) => p.id === selectedPlan);
      await platform(previous ? `/plans/${previous.id}` : '/plans', {
        method: previous ? 'PUT' : 'POST',
        body: JSON.stringify({
          title: previous?.title || a!.title,
          items: [
            ...(previous?.items || []),
            {
              type: ['accommodation', 'ride', 'parking'].includes(a!.category)
                ? a!.category
                : 'activity',
              referenceId: id,
              title: a!.title,
              status: external ? 'external' : 'saved',
              start: a!.start,
              end: a!.end,
              url: a!.actions[0]?.url,
              snapshot: a,
            },
            ...Object.values(results)
              .filter((r) => r.itineraries.length)
              .map((result) => ({
                type: result.arriveBy ? 'outbound' : 'return',
                title: result.arriveBy ? '往路' : '帰路',
                status: 'saved',
                start: result.itineraries[result.selected]?.start,
                end: result.itineraries[result.selected]?.end,
                data: result,
              })),
          ],
        }),
      });
      setPlans(await platform<any[]>('/plans'));
      setMessage('予定を保存しました。申込み・予約はまだ成立していません。');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div className="maas-workspace space-y-5">
      <a className="maas-back" href="/explore">
        ← イベント・施設の一覧
      </a>
      <ErrorMessage text={error} />
      {!a ? (
        !error && <Loading />
      ) : (
        <>
          <p>
            {a.region} · {sourceLabel}
          </p>
          {serviceIds.includes(a.sourceId) && (
            <a className="underline" href={`/services?source=${encodeURIComponent(a.sourceId)}`}>
              接続サービスの空き・申込みを確認
            </a>
          )}
          <h1 className="text-3xl font-bold">{a.title}</h1>
          <p className="whitespace-pre-wrap">{a.description}</p>
          {a.detailStatus === 'unavailable' && (
            <p>詳細の取得に失敗しました。公式ページで確認してください。</p>
          )}
          {a.bookingWindow && (
            <p>
              空室検索：{a.bookingWindow.checkinDate}〜{a.bookingWindow.checkoutDate} · 大人
              {a.bookingWindow.adults}名。予約未確定。
            </p>
          )}
          {a.receptionStart && (
            <p>受付開始：{new Date(a.receptionStart).toLocaleString('ja-JP')}</p>
          )}
          <p>
            {a.price
              ? `${a.price.currency} ${a.price.amount} · ${a.price.conditions}`
              : '価格情報なし。料金・申込み条件は提供元で確認してください。'}
          </p>
          {a.status === 'cancelled' && (
            <p role="status">開催中止です。交通・宿泊の取消条件は各接続先で確認してください。</p>
          )}
          <p>
            {a.place.name} {a.place.address}
          </p>
          <p>
            {a.start ? new Date(a.start).toLocaleString('ja-JP') : '開催時刻未設定'} —{' '}
            {a.end ? new Date(a.end).toLocaleString('ja-JP') : '終了時刻未設定'}
          </p>
          {a.actions.map((x) => (
            <a
              key={x.url}
              href={x.url}
              onClick={() => setExternal(true)}
              target="_blank"
              rel="noreferrer"
              className="inline-block border rounded px-4 py-2"
            >
              {x.label}
            </a>
          ))}
          {a.online ? (
            <p>オンライン参加のため移動案内はありません。</p>
          ) : a.place.lat === undefined || a.place.lon === undefined ? (
            <p>会場の座標が公開されていないため移動案内はできません。</p>
          ) : (
            <section className="rounded-xl border p-5 space-y-4">
              <h2 className="text-xl font-semibold">行き方・帰り方</h2>
              <button
                className="border rounded p-2"
                onClick={() =>
                  navigator.geolocation.getCurrentPosition(
                    (p) => {
                      setOriginName('現在地');
                      setLat(String(p.coords.latitude));
                      setLon(String(p.coords.longitude));
                    },
                    () => setError('現在地を取得できませんでした。駅・施設を検索してください。'),
                  )
                }
              >
                現在地を使う
              </button>
              {!a.start && (
                <label className="block">
                  到着日時
                  <input
                    type="datetime-local"
                    value={arrivalTime}
                    onChange={(e) => setArrivalTime(e.target.value)}
                    className="border rounded p-2"
                  />
                </label>
              )}
              <PlacePicker
                label="出発地"
                onClear={() => {
                  setLat('');
                  setLon('');
                  setOriginName('');
                }}
                onSelect={(p) => {
                  setLat(String(p.lat));
                  setLon(String(p.lon));
                  setOriginName(p.name);
                }}
              />
              {originName && <p>出発地：{originName}</p>}
              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  到着の余裕（分）
                  <input
                    type="number"
                    min={0}
                    max={240}
                    className="block border rounded p-2"
                    value={buffer}
                    onChange={(e) => setBuffer(Number(e.target.value))}
                  />
                </label>
                <label>
                  帰路の日時（終了時刻を変更する場合）
                  <input
                    type="datetime-local"
                    className="block border rounded p-2"
                    value={returnTime}
                    onChange={(e) => setReturnTime(e.target.value)}
                  />
                </label>
              </div>
              <div className="flex gap-3">
                <button className="border rounded px-4 py-2" onClick={() => route('outbound')}>
                  開始までに到着
                </button>
                <button className="border rounded px-4 py-2" onClick={() => route('return')}>
                  終了後に帰る
                </button>
              </div>
              {Object.values(results).map((result: any) => (
                <div key={result.arriveBy ? 'outbound' : 'return'}>
                  <p>
                    {new Date(result.dateTime).toLocaleString('ja-JP')} ·{' '}
                    {result.arriveBy ? '到着' : '出発'}
                  </p>
                  {!result.itineraries.length ? (
                    <p>経路が見つかりませんでした。</p>
                  ) : (
                    result.itineraries.map((r: any, i: number) => (
                      <article className="border rounded p-3 mt-2" key={i}>
                        <label>
                          <input
                            type="radio"
                            name={result.arriveBy ? 'outbound-route' : 'return-route'}
                            checked={result.selected === i}
                            onChange={() =>
                              setResults((old) => ({
                                ...old,
                                [result.arriveBy ? 'outbound' : 'return']: {
                                  ...result,
                                  selected: i,
                                },
                              }))
                            }
                          />{' '}
                          この経路を予定に追加
                        </label>
                        <JourneyView route={r} />
                      </article>
                    ))
                  )}
                </div>
              ))}
            </section>
          )}
          {plans.length > 0 && (
            <label className="block">
              追加先の予定
              <select
                className="border rounded p-2 ml-3"
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
              >
                <option value="">新しい予定</option>
                {plans.map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button className="rounded bg-blue-700 text-white px-5 py-3" onClick={save}>
            自分の予定に保存
          </button>
          {message && <p role="status">{message}</p>}
        </>
      )}
    </div>
  );
}
