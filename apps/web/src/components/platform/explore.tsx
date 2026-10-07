'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { platform, type Activity } from '@/lib/platform';
import { ErrorMessage, Loading } from './shell';
import SharedPlan from './shared-plan';
export default function Explore() {
  const [rows, setRows] = useState<Activity[]>();
  const [sources, setSources] = useState<any[]>([]);
  const [transit, setTransit] = useState<any>();
  const [shared, setShared] = useState<any[]>([]);
  const [q, setQ] = useState(''),
    [date, setDate] = useState(''),
    [category, setCategory] = useState('');
  const [error, setError] = useState('');
  const [checkin, setCheckin] = useState(''),
    [checkout, setCheckout] = useState(''),
    [adults, setAdults] = useState(1),
    [hotelSource, setHotelSource] = useState(''),
    [searching, setSearching] = useState(false);
  const [timezone, setTimezone] = useState('Asia/Tokyo'),
    [region, setRegion] = useState('');
  useEffect(() => {
    platform<any>('/config')
      .then((c) => setTimezone(c.timezone))
      .catch(() => {});
  }, []);
  useEffect(() => {
    let active = true;
    Promise.all([
      platform<Activity[]>('/activities'),
      platform<any[]>('/sources'),
      platform<any>('/transit'),
      platform<any[]>('/shared-mobility'),
    ])
      .then(([a, s, t, b]) => {
        if (active) {
          setRows(a);
          setSources(s);
          setTransit(t);
          setShared(b);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  const list = (rows || []).filter(
    (a) =>
      (!q || `${a.title} ${a.region} ${a.place.name}`.includes(q)) &&
      (!region || a.region === region) &&
      (!category || a.category === category) &&
      (!date ||
        !a.start ||
        new Intl.DateTimeFormat('sv-SE', {
          timeZone: timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date(a.start)) === date),
  );
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">次の目的地を見つける</h1>
        <p className="mt-2 text-slate-600">活動を選び、行き方と帰り方を確かめる。</p>
      </div>
      <ErrorMessage text={error} />
      {sources.some((s) => s.kind === 'rakuten' && s.status !== 'disabled') && (
        <form
          className="border rounded-xl p-4 flex flex-wrap items-end gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setSearching(true);
            setError('');
            try {
              const found = await platform<Activity[]>('/accommodations/search', {
                method: 'POST',
                body: JSON.stringify({
                  sourceId:
                    hotelSource ||
                    sources.find((s) => s.kind === 'rakuten' && s.status !== 'disabled')?.id,
                  checkinDate: checkin,
                  checkoutDate: checkout,
                  adults,
                }),
              });
              setRows((old) => [
                ...(old || []).filter((a) => a.category !== 'accommodation'),
                ...found,
              ]);
              setCategory('accommodation');
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setSearching(false);
            }
          }}
        >
          <label>
            宿泊情報源
            <select
              className="block border rounded p-2"
              value={hotelSource}
              onChange={(e) => setHotelSource(e.target.value)}
            >
              {sources
                .filter((s) => s.kind === 'rakuten' && s.status !== 'disabled')
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
            </select>
          </label>
          <label>
            チェックイン
            <input
              required
              type="date"
              value={checkin}
              onChange={(e) => setCheckin(e.target.value)}
              className="block border rounded p-2"
            />
          </label>
          <label>
            チェックアウト
            <input
              required
              type="date"
              value={checkout}
              onChange={(e) => setCheckout(e.target.value)}
              className="block border rounded p-2"
            />
          </label>
          <label>
            大人人数
            <input
              type="number"
              min={1}
              max={6}
              value={adults}
              onChange={(e) => setAdults(Number(e.target.value))}
              className="block border rounded p-2 w-20"
            />
          </label>
          <button disabled={searching} className="border rounded p-2">
            {searching ? '検索中…' : '空室を検索'}
          </button>
          <p>空室検索は予約の確定ではありません。詳細・購入は楽天トラベルで確認してください。</p>
        </form>
      )}

      <form onSubmit={(e) => e.preventDefault()} className="grid gap-3 sm:grid-cols-4">
        <label>
          地域
          <select
            className="block w-full border rounded p-2"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          >
            <option value="">すべて</option>
            {[...new Set((rows || []).map((a) => a.region))].filter(Boolean).map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <label>
          場所・キーワード
          <input
            className="block w-full border rounded p-2"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <label>
          日付
          <input
            type="date"
            className="block w-full border rounded p-2"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label>
          カテゴリ
          <select
            className="block w-full border rounded p-2"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">すべて</option>
            {[
              ['event', 'イベント'],
              ['experience', '体験'],
              ['facility', '施設'],
              ['accommodation', '宿泊'],
              ['parking', '駐車場'],
              ['ride', '配車'],
            ].map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </form>
      {!rows && !error ? (
        <Loading />
      ) : !list.length ? (
        <p className="rounded border p-6">
          該当する情報はありません。接続済みのデータ源と検索条件をご確認ください。
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {list.map((a) => (
            <article key={a.id} className="rounded-xl border p-5">
              <p className="text-sm text-slate-500">
                {a.region} · {sources.find((s) => s.id === a.sourceId)?.label || a.sourceId}
              </p>
              <h2 className="text-xl font-semibold mt-2">
                <Link href={`/activities/${encodeURIComponent(a.id)}`}>{a.title}</Link>
              </h2>
              <p className="mt-2">
                {a.place.name} {a.online ? '（オンライン）' : ''}
              </p>
              {a.start && <p>{new Date(a.start).toLocaleString('ja-JP')}</p>}
              <p className="mt-2 text-sm">{a.description}</p>
              <p>
                {a.price
                  ? `${a.price.currency} ${a.price.amount}（参考）`
                  : '価格情報なし · 提供元で確認'}
              </p>
              {a.status === 'cancelled' && <p role="status">開催中止</p>}
            </article>
          ))}
        </div>
      )}
      <section className="border-t pt-5">
        <h2 className="text-xl font-semibold">交通情報</h2>
        <p>
          停留所 {transit?.stops?.length || 0}件 · 運行情報 {transit?.realtime?.length || 0}件 ·
          シェア交通情報 {shared.length}件
        </p>
        {transit?.stops?.slice(0, 20).map((s: any) => (
          <details key={s.id} className="border rounded p-3 mt-2">
            <summary>{s.stop_name}</summary>
            <Departures
              stopId={s.id}
              calendars={s.stop_id.startsWith('odpt.') ? transit.calendars : []}
            />
          </details>
        ))}
        {transit?.realtime?.slice(0, 10).map((r: any) => (
          <p key={r.id || JSON.stringify(r)}>
            {r.text?.ja || r.alert?.headerText?.translation?.[0]?.text || '運行情報'} ·{' '}
            {r.timestamp
              ? new Date(Number(r.timestamp) * 1000).toLocaleString('ja-JP')
              : r.time || r.fetchedAt}{' '}
            {r.stale ? '・情報が古くなっています' : ''}
          </p>
        ))}
        {shared
          .filter((s) => s.feed === 'station_status')
          .slice(0, 15)
          .map((s: any) => (
            <p key={`${s.sourceId}:${s.station_id}`}>
              {shared.find(
                (x) =>
                  x.sourceId === s.sourceId &&
                  x.station_id === s.station_id &&
                  x.feed === 'station_information',
              )?.name || s.station_id}
              ：利用可能{' '}
              {s.is_renting === false
                ? '貸出停止'
                : (s.num_vehicles_available ?? s.num_bikes_available ?? '不明')}
              台 / 返却可能{' '}
              {s.is_returning === false ? '返却停止' : (s.num_docks_available ?? '不明')}台{' '}
              {s.stale ? '・情報が古くなっています' : ''}
            </p>
          ))}
      </section>
      <SharedPlan records={shared} />
      <section className="border-t pt-5">
        <h2 className="text-xl font-semibold">情報源と更新状態</h2>
        {sources.length ? (
          sources.map((s) => (
            <div key={s.id} className="mt-3 text-sm">
              <p>
                {s.label}：{s.status} {s.stale ? '・最新情報を取得できていません' : ''}
              </p>
              <p>
                最終成功：{s.lastSuccess || '未接続'} ·{' '}
                <a href={s.termsUrl} target="_blank" rel="noreferrer">
                  {s.attribution}
                </a>
              </p>
              {s.error && <p>{s.error}</p>}
            </div>
          ))
        ) : (
          <p>情報源がまだ設定されていません。</p>
        )}
      </section>
    </div>
  );
}
function Departures({ stopId, calendars = [] }: { stopId: string; calendars?: string[] }) {
  const [rows, setRows] = useState<any[]>([]),
    [error, setError] = useState('');
  const [calendar, setCalendar] = useState('');
  const [date, setDate] = useState(new Date().toLocaleDateString('sv-SE'));
  useEffect(() => {
    let active = true;
    if (calendars.length && !calendar) {
      setRows([]);
      return;
    }
    setError('');
    platform<any[]>(
      `/transit/departures?stopId=${encodeURIComponent(stopId)}&date=${date}${calendar ? '&calendar=' + encodeURIComponent(calendar) : ''}`,
    )
      .then((r) => {
        if (active) setRows(r);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [stopId, date, calendar, calendars.length]);
  return (
    <div>
      <label>
        運行日
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border p-2"
        />
      </label>
      {calendars.length > 0 && (
        <label>
          時刻表の運行区分
          <select
            className="border p-2"
            value={calendar}
            onChange={(e) => setCalendar(e.target.value)}
          >
            <option value="">選択してください</option>
            {calendars.map((c) => (
              <option key={c} value={c}>
                {c.split(':').at(-1)}
              </option>
            ))}
          </select>
        </label>
      )}
      {calendars.length > 0 && (
        <p>祝日区分は日付から推測しません。提供元の運行区分を選んでください。</p>
      )}
      <ErrorMessage text={error} />
      {rows.length ? (
        rows.map((r, i) => (
          <p key={i}>
            {r.departure_time} · {r.trip_id}
          </p>
        ))
      ) : (
        <p>この日の出発情報はありません。</p>
      )}
    </div>
  );
}
