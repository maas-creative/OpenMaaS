'use client';
import { useEffect, useState } from 'react';
import { platform, type Session } from '@/lib/platform';
import { safeWebUrl } from '@openmaas/common/platform-display';
import { ErrorMessage } from './shell';
export default function SharedPlan({ records }: { records: any[] }) {
  const [plans, setPlans] = useState<any[]>([]),
    [selectedPlan, setSelectedPlan] = useState(''),
    [stationKey, setStationKey] = useState(''),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  useEffect(() => {
    platform<Session>('/auth/session')
      .then((s) => (s.authenticated ? platform<any[]>('/plans') : []))
      .then(setPlans)
      .catch(() => {});
  }, []);
  const stations = records.filter((s) =>
    ['station_information', 'vehicle_status', 'free_bike_status'].includes(s.feed),
  );
  if (!stations.length) return null;
  return (
    <form
      className="border rounded p-4 space-y-3 mt-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setError('');
        try {
          const station =
            stations.find(
              (s) => `${s.sourceId}:${s.station_id || s.vehicle_id || s.bike_id}` === stationKey,
            ) || stations[0];
          const system = records.find(
            (s) => s.sourceId === station.sourceId && s.feed === 'system_information',
          );
          const url = station.rental_uris?.web || system?.url;
          const safeUrl = safeWebUrl(url);
          const p = plans.find((p) => p.id === selectedPlan);
          await platform<any>(p ? `/plans/${p.id}` : '/plans', {
            method: p ? 'PUT' : 'POST',
            body: JSON.stringify({
              title: p?.title || 'シェア交通の予定',
              items: [
                ...(p?.items || []),
                {
                  type: 'ride',
                  title: station.name || 'シェア交通ポート',
                  status: 'saved',
                  url: safeUrl,
                  data: {
                    sourceId: station.sourceId,
                    stationId: station.station_id,
                    vehicleId: station.vehicle_id || station.bike_id,
                    lat: station.lat,
                    lon: station.lon,
                  },
                },
              ],
            }),
          });
          setMessage('ポートを予定に追加しました。車両の確保・予約は成立していません。');
          setPlans(await platform<any[]>('/plans'));
        } catch (e) {
          setError((e as Error).message);
        }
      }}
    >
      <h3 className="font-semibold">シェア交通を予定に追加</h3>
      <ErrorMessage text={error} />
      <label className="block">
        ポート
        <select
          className="border rounded p-2 ml-2"
          value={stationKey}
          onChange={(e) => setStationKey(e.target.value)}
        >
          {stations.map((s) => (
            <option
              key={`${s.sourceId}:${s.station_id || s.vehicle_id || s.bike_id}`}
              value={`${s.sourceId}:${s.station_id || s.vehicle_id || s.bike_id}`}
            >
              {s.name || 'シェア交通ポート'}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        追加先の予定
        <select
          className="border rounded p-2 ml-2"
          value={selectedPlan}
          onChange={(e) => setSelectedPlan(e.target.value)}
        >
          <option value="">新しい予定</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </label>
      <button className="border rounded p-2">ポートを予定に保存</button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
