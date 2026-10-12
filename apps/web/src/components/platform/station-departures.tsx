'use client';
import { useState } from 'react';
import { platform } from '@/lib/platform';
import { ErrorMessage } from './shell';
interface Board {
  departures: {
    routeName: string;
    headsign?: string;
    trainType?: string;
    departureTime: string;
    timezone: string;
    headwayBased: boolean;
  }[];
}
export default function StationDepartures({
  id,
  name,
  dateTime,
}: {
  id: string;
  name: string;
  dateTime: string;
}) {
  const [board, setBoard] = useState<Board>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [open, setOpen] = useState(false);
  return (
    <div className="space-y-2">
      <button
        className="underline"
        type="button"
        disabled={busy}
        aria-expanded={open}
        onClick={async () => {
          if (board) {
            setOpen(!open);
            return;
          }
          setBusy(true);
          setError('');
          try {
            setBoard(
              await platform<Board>(
                `/transit/station-departures?id=${encodeURIComponent(id)}&dateTime=${encodeURIComponent(dateTime)}`,
              ),
            );
            setOpen(true);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? '時刻表を取得中…' : open ? '発車予定を閉じる' : `${name}の発車予定を見る`}
      </button>
      <ErrorMessage text={error} />
      {board && open && (
        <>
          <p className="text-sm">選んだ経路の乗車時刻以降の、時刻表による案内です。</p>
          {!board.departures.length && <p>この時刻以降の便は取得できませんでした。</p>}
          <ul className="divide-y rounded-lg border bg-slate-50 px-3">
            {board.departures.map((d, i) => (
              <li key={i} className="py-3 text-sm">
                {new Date(d.departureTime).toLocaleString('ja-JP', { timeZone: d.timezone })}{' '}
                {d.routeName} {d.trainType} {d.headsign && `行き先：${d.headsign}`}
                {d.headwayBased ? '（一定間隔で運行する便の目安）' : ''}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
