'use client';
import { useEffect, useRef, useState } from 'react';
import type { Map as TransitMap } from '@/lib/journey';
export default function RouteMap({ data }: { data: TransitMap }) {
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let disposed = false;
    let map: import('leaflet').Map | undefined;
    setError('');
    import('leaflet')
      .then((L) => {
        if (disposed || !container.current) return;
        map = L.map(container.current, { scrollWheelZoom: false });
        const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
          maxZoom: 19,
        });
        tiles.on('tileerror', () =>
          setError('背景地図を読み込めませんでした。経路線と下の区間案内をご確認ください。'),
        );
        tiles.addTo(map);
        const bounds = L.latLngBounds([]);
        for (const s of data.segments) {
          if (s.polyline.length < 2) continue;
          const points: import('leaflet').LatLngTuple[] = s.polyline.map((p) => [p.lat, p.lon]);
          const line = L.polyline(points, {
            color: s.kind === 'walk' ? '#52525b' : '#0369a1',
            weight: 5,
            dashArray: s.kind === 'walk' ? '6 6' : undefined,
          }).addTo(map);
          if (s.routeName) {
            const label = document.createElement('span');
            label.textContent = s.routeName;
            line.bindTooltip(label);
          }
          bounds.extend(line.getBounds());
        }
        for (const p of data.points) {
          const label = document.createElement('span');
          label.textContent = p.name;
          L.circleMarker([p.lat, p.lon], {
            radius: 7,
            color: '#075985',
            fillColor: '#fff',
            fillOpacity: 1,
            weight: 3,
          })
            .bindPopup(label)
            .addTo(map);
          bounds.extend([p.lat, p.lon]);
        }
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [24, 24], maxZoom: 16 });
        else {
          setError('この経路の地図情報はありません。区間案内をご確認ください。');
          map.remove();
          map = undefined;
        }
      })
      .catch(() => setError('地図を読み込めませんでした。区間案内をご確認ください。'));
    return () => {
      disposed = true;
      map?.remove();
    };
  }, [data]);
  return (
    <div className="space-y-2">
      <div
        ref={container}
        className="h-80 rounded-xl border relative z-0"
        aria-label="経路と乗降場所の地図"
        role="region"
      />
      {error && <p role="status">{error}</p>}
      <p className="text-sm">青線：交通機関、破線：徒歩。丸印を押すと場所の名前を確認できます。</p>
      {data.segments.some((s) =>
        ['estimatedWalk', 'direct', 'stopOrder'].includes(s.geometrySource),
      ) && (
        <p className="text-sm">
          一部の線は地点を結んだ目安です。実際に歩ける道や入口を確認してください。
        </p>
      )}
      {data.segments.some((s) => s.geometrySource === 'gsiRailCenterline') && (
        <p className="text-sm">鉄道路線形状：国土地理院のデータを使用</p>
      )}
      <ul className="text-sm">
        {data.points.map((p) => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ul>
    </div>
  );
}
