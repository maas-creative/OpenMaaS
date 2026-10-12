'use client';
import { useState, useRef, useEffect } from 'react';
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
  value,
}: {
  value?: SelectedPlace;
  label: string;
  onSelect: (p: SelectedPlace) => void;
  onClear: () => void;
}) {
  const requestId = useRef(0);
  const [query, setQuery] = useState(value?.name || ''),
    [rows, setRows] = useState<SelectedPlace[]>(),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (value) setQuery(value.name);
  }, [value]);
  return (
    <div className="space-y-2">
      <label className="block">
        {label}
        <input
          className="block border rounded p-2 w-full"
          value={query}
          onChange={(e) => {
            requestId.current++;
            setBusy(false);
            onClear();
            setQuery(e.target.value);
            setRows(undefined);
          }}
          placeholder="駅・施設名・住所"
        />
      </label>
      <button
        type="button"
        disabled={busy || query.trim().length < 1}
        className="border rounded p-2"
        onClick={async () => {
          const id = ++requestId.current;
          setBusy(true);
          setError('');
          try {
            const result = await platform<SelectedPlace[]>(
              `/places?q=${encodeURIComponent(query.trim())}`,
            );
            if (id === requestId.current) setRows(result);
          } catch (e) {
            if (id === requestId.current) setError((e as Error).message);
          } finally {
            if (id === requestId.current) setBusy(false);
          }
        }}
      >
        {busy ? '検索中…' : '地点を探す'}
      </button>
      <ErrorMessage text={error} />
      {rows?.length === 0 && <p>地点が見つかりません。別の名前か、現在地を使ってください。</p>}
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
