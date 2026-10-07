'use client';
import { useEffect, useState } from 'react';
import { apiOrigin, platform } from '@/lib/platform';
export default function CalendarConnect({ planId }: { planId: string }) {
  const [sources, setSources] = useState<any[]>([]),
    [source, setSource] = useState(''),
    [calendars, setCalendars] = useState<any[]>([]),
    [calendar, setCalendar] = useState(''),
    [message, setMessage] = useState('');
  useEffect(() => {
    platform<any[]>('/service-connections')
      .then((s) =>
        setSources(
          s.filter((s) => s.kind === 'google-calendar' && s.operations.includes('calendar-write')),
        ),
      )
      .catch(() => {});
  }, []);
  if (!sources.length) return null;
  return (
    <div className="border rounded p-3 space-y-2">
      <label>
        Google Calendarへ持ち出す
        <select
          className="block border rounded p-2"
          value={source}
          onChange={(e) => {
            setSource(e.target.value);
            setCalendars([]);
            setCalendar('');
          }}
        >
          <option value="">接続を選択</option>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      {source && (
        <>
          <a
            className="underline mr-3"
            href={`${apiOrigin}/api/v1/integrations/${source}/google/authorize`}
          >
            Googleアカウントを接続
          </a>
          <button
            className="border rounded p-2"
            onClick={async () => {
              try {
                setCalendars(await platform<any[]>(`/integrations/${source}/google/calendars`));
              } catch (e) {
                setMessage((e as Error).message);
              }
            }}
          >
            自分のカレンダーを取得
          </button>
          {calendars.length > 0 && (
            <label>
              登録先
              <select
                className="block border rounded p-2"
                value={calendar}
                onChange={(e) => setCalendar(e.target.value)}
              >
                <option value="">選択</option>
                {calendars.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.summary}
                  </option>
                ))}
              </select>
            </label>
          )}
          {calendar && (
            <button
              className="border rounded p-2"
              onClick={async () => {
                try {
                  await platform(`/integrations/${source}/google/plans/${planId}`, {
                    method: 'POST',
                    body: JSON.stringify({ calendarId: calendar }),
                  });
                  setMessage('選択した予定を登録・更新しました');
                } catch (e) {
                  setMessage((e as Error).message);
                }
              }}
            >
              この予定を登録・更新
            </button>
          )}
          <button
            className="border rounded p-2 ml-3"
            onClick={async () => {
              try {
                await platform(`/integrations/${source}/google`, { method: 'DELETE' });
                setCalendars([]);
                setMessage('連携を解除しました。登録済みのGoogle予定は残ります。');
              } catch (e) {
                setMessage((e as Error).message);
              }
            }}
          >
            連携解除
          </button>
        </>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
