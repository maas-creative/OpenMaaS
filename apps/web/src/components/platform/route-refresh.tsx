'use client';
import { useState } from 'react';
import { platform } from '@/lib/platform';
import type { Journey, SavedPlan } from '@/lib/journey';
import JourneyView from './journey-view';
import { ErrorMessage } from './shell';
export default function RouteRefresh({
  plan,
  index,
  onSaved,
}: {
  plan: SavedPlan;
  index: number;
  onSaved: () => void;
}) {
  const item = plan.items[index];
  const savedSearch = item?.data?.search;
  const [result, setResult] = useState<Journey>(),
    [selected, setSelected] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  if (!savedSearch) return null;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <button className="underline" disabled={busy} onClick={() => void refresh(false)}>
          保存した条件で再検索
        </button>
        <button className="underline" disabled={busy} onClick={() => void refresh(true)}>
          今から出発する経路を探す
        </button>
      </div>
      <ErrorMessage text={error} />
      {busy && <p role="status">再検索中…</p>}
      {result && (
        <>
          <p>最新の検索結果です。保存済みの経路は、更新するまで変わりません。</p>
          {result.coverage?.notices.map((n, i) => <p key={i}>{n.message}</p>)}
          {!result.itineraries.length && (
            <p>経路が見つかりません。日時や目的地を変えて検索してください。</p>
          )}
          <label>
            新しい経路
            <select
              className="border rounded p-2"
              value={selected}
              onChange={(e) => setSelected(Number(e.target.value))}
            >
              {result.itineraries.map((r, i) => (
                <option key={r.id || i} value={i}>
                  候補{i + 1}・{Math.ceil((r.duration || 0) / 60)}分・乗換{r.transfers}回
                </option>
              ))}
            </select>
          </label>
          {result.itineraries[selected] && (
            <>
              <JourneyView route={result.itineraries[selected]} />
              <button
                className="border rounded p-2"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError('');
                  try {
                    const r = result.itineraries[selected];
                    await platform(`/plans/${plan.id}`, {
                      method: 'PUT',
                      body: JSON.stringify({
                        title: plan.title,
                        items: plan.items.map((old, i) =>
                          i === index
                            ? {
                                ...old,
                                start: r.start,
                                end: r.end,
                                data: { ...result, itineraries: [r], selected: 0 },
                              }
                            : old,
                        ),
                      }),
                    });
                    setResult(undefined);
                    onSaved();
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                この経路で予定を更新
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
  async function refresh(now: boolean) {
    if (!savedSearch) return;
    setBusy(true);
    setError('');
    setResult(undefined);
    try {
      setResult(
        await platform<Journey>('/routes/search', {
          method: 'POST',
          body: JSON.stringify({
            ...savedSearch,
            ...(now ? { dateTime: new Date().toISOString(), searchType: 'departure' } : {}),
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
}
