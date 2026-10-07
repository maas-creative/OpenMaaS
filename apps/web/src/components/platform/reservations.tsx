'use client';
import { useEffect, useState } from 'react';
import { platform } from '@/lib/platform';
const labels: Record<string, string> = {
  unknown: '結果不明・再照会が必要',
  pending: '予約保留',
  confirmed: '予約確定（支払状況は提供元で確認）',
  cancel_pending: '取消処理中',
  cancelled: '取消済み',
  rejected: '申込み不成立',
  completed: '利用終了',
};
export default function Reservations() {
  const [rows, setRows] = useState<any[]>([]),
    [error, setError] = useState(''),
    [cancellation, setCancellation] = useState<any>(),
    [reason, setReason] = useState('');
  async function reload() {
    try {
      setRows(await platform<any[]>('/reservations'));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void reload();
  }, []);
  async function act(id: string, op: string, body: unknown = {}) {
    try {
      await platform(`/reservations/${id}/${op}`, { method: 'POST', body: JSON.stringify(body) });
      await reload();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">接続サービスの予約</h2>
      {error && <p role="alert">{error}</p>}
      {rows.length === 0 && <p>APIで確認した予約はありません。</p>}
      {rows.map((r) => (
        <article className="border rounded p-4 space-y-2" key={r.id}>
          <h3>
            {r.body.title} · {labels[r.status] || r.status}
          </h3>
          <p className="break-words">{r.body.terms}</p>
          {r.body.planId && <p>保存した予定に関連付けています。</p>}
          {r.body.actions?.map((a: any) => (
            <a className="underline mr-3" href={a.url} key={a.url}>
              {a.label}
            </a>
          ))}
          <button className="border rounded p-2 mr-3" onClick={() => act(r.id, 'refresh')}>
            提供元へ再照会
          </button>
          {['confirmed', 'pending', 'cancel_pending'].includes(r.status) && (
            <button
              className="border rounded p-2"
              onClick={async () => {
                try {
                  const quote = await platform<any>(`/reservations/${r.id}/cancellation`);
                  setCancellation({ ...quote, id: r.id });
                  setReason('');
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              この予約を取消
            </button>
          )}
        </article>
      ))}
      {cancellation && (
        <div className="border rounded p-4 space-y-3">
          <h3>取消条件を確認する</h3>
          <p className="break-words">{JSON.stringify(cancellation.terms)}</p>
          {cancellation.reasons && (
            <label>
              取消理由
              <select
                className="border rounded p-2 block"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                <option value="">選択してください</option>
                {cancellation.reasons.map((r: any) => (
                  <option key={r.cancellationReasonCode} value={r.cancellationReasonCode}>
                    {r.cancellationReasonText}
                  </option>
                ))}
              </select>
            </label>
          )}
          <p>この予約だけを取り消します。ほかの予定・予約は取り消しません。</p>
          <button
            disabled={!!cancellation.reasons && !reason}
            className="border rounded p-2 mr-3"
            onClick={async () => {
              await act(cancellation.id, 'cancel', {
                digest: cancellation.digest,
                ...(reason ? { reasonCode: reason } : {}),
              });
              setCancellation(undefined);
            }}
          >
            条件を確認して取消
          </button>
          <button className="border rounded p-2" onClick={() => setCancellation(undefined)}>
            戻る
          </button>
        </div>
      )}
    </section>
  );
}
