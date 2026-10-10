'use client';
import { useState } from 'react';
import { platform } from '@/lib/platform';
import { ErrorMessage } from './shell';
export interface SelectedPlace {
  name: string;
  address?: string;
  lat: number;
  lon: number;
}
export default function PlacePicker({
  label,
  onSelect,
  onClear,
}: {
  label: string;
  onSelect: (p: SelectedPlace) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState(''),
    [rows, setRows] = useState<SelectedPlace[]>(),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  return (
    <div className="space-y-2">
      <label className="block">
        {label}
        <input
          className="block border rounded p-2 w-full"
          value={query}
          onChange={(e) => {
            onClear();
            setQuery(e.target.value);
            setRows(undefined);
          }}
          placeholder="駅・施設名・登録された住所"
        />
      </label>
      <button
        type="button"
        disabled={busy || query.trim().length < 2}
        className="border rounded p-2"
        onClick={async () => {
          setBusy(true);
          setError('');
          try {
            setRows(
              await platform<SelectedPlace[]>(`/places?q=${encodeURIComponent(query.trim())}`),
            );
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? '検索中…' : '地点を探す'}
      </button>
      <ErrorMessage text={error} />
      {rows?.length === 0 && (
        <p>登録された駅・施設に見つかりません。別の名前か、現在地を使ってください。</p>
      )}
      <ul>
        {rows?.map((p, i) => (
          <li key={i}>
            <button
              type="button"
              className="text-left underline py-2"
              onClick={() => {
                onSelect(p);
                setQuery(p.name);
                setRows(undefined);
              }}
            >
              {p.name} {p.address}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
