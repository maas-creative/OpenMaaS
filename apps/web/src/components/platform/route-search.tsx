'use client';
import { useState } from 'react';
import { platform } from '@/lib/platform';
import type { Journey, Place } from '@/lib/journey';
import PlacePicker from './place-picker';
import JourneyView from './journey-view';
import { ErrorMessage } from './shell';
const field = 'block w-full rounded border p-2';
export default function RouteSearch() {
  const [origin, setOrigin] = useState<Place>(),
    [destination, setDestination] = useState<Place>();
  const [date, setDate] = useState(() =>
    new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .format(new Date())
      .replace(' ', 'T'),
  );
  const [type, setType] = useState('departure'),
    [strategy, setStrategy] = useState('balanced'),
    [transfers, setTransfers] = useState(3);
  const [result, setResult] = useState<Journey>(),
    [selected, setSelected] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [saving, setSaving] = useState(false);
  async function search() {
    if (!origin || !destination || !date) return;
    setBusy(true);
    setError('');
    setMessage('');
    setResult(undefined);
    try {
      setResult(
        await platform<Journey>('/routes/search', {
          method: 'POST',
          body: JSON.stringify({
            origin,
            destination,
            dateTime: new Date(`${date}:00+09:00`).toISOString(),
            searchType: type,
            strategy,
            maxTransfers: transfers,
          }),
        }),
      );
      setSelected(0);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="maas-workspace space-y-6">
      <h1 className="text-3xl font-bold">行き方を調べる</h1>
      <form
        className="maas-route-form rounded-xl border p-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void search();
        }}
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <PlacePicker
            label="出発地"
            value={origin}
            onSelect={setOrigin}
            onClear={() => setOrigin(undefined)}
          />
          <PlacePicker
            label="目的地"
            value={destination}
            onSelect={setDestination}
            onClear={() => setDestination(undefined)}
          />
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <button
            type="button"
            className="underline"
            disabled={!origin || !destination || busy}
            onClick={() => {
              setOrigin(destination);
              setDestination(origin);
            }}
          >
            出発地と目的地を入れ替える
          </button>
          <button
            type="button"
            className="underline"
            onClick={() => {
              navigator.geolocation.getCurrentPosition(
                (p) =>
                  setOrigin({ name: '現在地', lat: p.coords.latitude, lon: p.coords.longitude }),
                () => setError('現在地を取得できません。地点名から選んでください。'),
                { timeout: 10000 },
              );
            }}
          >
            現在地から出発する
          </button>
        </div>
        {origin?.name === '現在地' && <p>出発地：現在地</p>}
        <div className="grid sm:grid-cols-2 gap-4">
          <label>
            日時（日本時間）
            <input
              className={field}
              type="datetime-local"
              required
              value={date}
              onInput={(e) => setDate(e.currentTarget.value)}
            />
          </label>
          <label>
            検索する時刻
            <select className={field} value={type} onChange={(e) => setType(e.target.value)}>
              <option value="departure">この時刻に出発</option>
              <option value="arrival">この時刻までに到着</option>
              <option value="first">この日の最初の便（0時以降）</option>
              <option value="last">この日の終電・最終便</option>
            </select>
          </label>
        </div>
        <details className="maas-search-options">
          <summary>検索条件を調整</summary>
          <div className="grid sm:grid-cols-2 gap-4 pt-3">
            <label>
              優先すること
              <select
                className={field}
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
              >
                <option value="balanced">バランス</option>
                <option value="fastest">所要時間が短い</option>
                <option value="fewestTransfers">乗り換えが少ない</option>
                <option value="lowestFare">運賃が安い</option>
                <option value="shortestWalk">歩く時間が短い</option>
              </select>
            </label>
            <label>
              乗り換えの上限
              <select
                className={field}
                value={transfers}
                onChange={(e) => setTransfers(Number(e.target.value))}
              >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>
                    {n}回
                  </option>
                ))}
              </select>
            </label>
          </div>
        </details>
        <p className="text-sm text-slate-600">
          地点名と選んだ場所・日時を、行き方を調べるサービス（Transit API）へ送信します。
        </p>
        <button
          className="maas-primary w-full sm:w-auto rounded px-5 py-3"
          disabled={!origin || !destination || busy}
        >
          {busy ? '検索中…' : '経路を検索'}
        </button>
      </form>
      {busy && <p role="status">経路を検索しています…</p>}
      <ErrorMessage text={error} />
      {result && (
        <section className="space-y-4" aria-label="検索結果">
          <h2 className="text-2xl font-semibold">
            {result.search?.origin.name}から{result.search?.destination.name}
          </h2>
          <p className="text-sm text-slate-600">
            取得：{new Date(result.fetchedAt || '').toLocaleString('ja-JP')}
          </p>
          {result.coverage?.notices.map((n, i) => (
            <p key={i} className={n.severity === 'warning' ? 'rounded bg-amber-50 p-3' : ''}>
              {n.message}
            </p>
          ))}
          {!result.itineraries.length && (
            <p role="status">
              この条件では経路が見つかりませんでした。日時・地点・乗り換えの上限を変えてください。
            </p>
          )}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {result.itineraries.map((r, i) => (
              <button
                key={r.id || i}
                aria-pressed={selected === i}
                className={`rounded-xl border p-4 text-left ${selected === i ? 'border-sky-700 bg-sky-50 ring-1 ring-sky-700' : 'bg-white hover:bg-slate-50'}`}
                onClick={() => {
                  setSelected(i);
                  setMessage('');
                }}
              >
                <p className="font-semibold">
                  候補 {i + 1}
                  {selected === i ? ' ・選択中' : ''}
                  {r.recommended ? ' ・おすすめ' : ''}
                </p>
                <p className="my-2 text-lg font-semibold tabular-nums">
                  {new Date(r.start).toLocaleString('ja-JP', {
                    timeZone: 'Asia/Tokyo',
                    month: 'numeric',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  →{' '}
                  {new Date(r.end).toLocaleString('ja-JP', {
                    timeZone: 'Asia/Tokyo',
                    month: 'numeric',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                <p>
                  {Math.ceil((r.duration || 0) / 60)}分・乗換{r.transfers}回・徒歩
                  {Math.ceil((r.walkSeconds || 0) / 60)}分
                </p>
                <p>
                  {r.fare ? `${r.fare.ticket.toLocaleString()} ${r.fare.currency}` : '運賃情報なし'}
                </p>
              </button>
            ))}
          </div>
          {result.itineraries[selected] && (
            <>
              <JourneyView route={result.itineraries[selected]} />
              <button
                className="maas-primary rounded px-4 py-3"
                disabled={saving || !!message}
                onClick={async () => {
                  setSaving(true);
                  setError('');
                  try {
                    const r = result.itineraries[selected];
                    await platform('/plans', {
                      method: 'POST',
                      body: JSON.stringify({
                        title: `${result.search?.origin.name}から${result.search?.destination.name}`,
                        items: [
                          {
                            type: 'outbound',
                            title: `${result.search?.origin.name} → ${result.search?.destination.name}`,
                            status: 'saved',
                            start: r.start,
                            end: r.end,
                            data: { ...result, itineraries: [r], selected: 0 },
                          },
                        ],
                      }),
                    });
                    setMessage('経路を予定に保存しました。乗車券の購入・予約はしていません。');
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving ? '保存中…' : message ? '保存済み' : 'この経路を予定に保存'}
              </button>
            </>
          )}
          {message && <p role="status">{message}</p>}
          <button className="underline" disabled={busy} onClick={() => void search()}>
            入力した条件で再検索
          </button>
          <p className="text-sm">
            交通データ：{result.coverage?.feeds.map((f) => f.name).join('、')}。{result.attribution}{' '}
            /{' '}
            <a className="underline" href="https://api.transit.ls8h.com/api/v1/feeds">
              データの提供元・利用条件
            </a>
          </p>
        </section>
      )}
    </div>
  );
}
