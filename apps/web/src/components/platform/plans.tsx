'use client';
import { useEffect, useState } from 'react';
import { apiOrigin, platform } from '@/lib/platform';
import { ErrorMessage, Loading } from './shell';
import Reservations from './reservations';
import CalendarConnect from './calendar-connect';
const labels: Record<string, string> = {
  saved: '未予約',
  external: '外部サイトへ案内',
  pending: '支払い待ち',
  paid: '利用可能',
  used: '使用済み',
  refund_pending: '返金処理中',
  refunded: '返金済み',
  expired: '期限切れ',
};
export default function Plans() {
  const [plans, setPlans] = useState<any[]>(),
    [orders, setOrders] = useState<any[]>([]),
    [error, setError] = useState('');
  async function reload() {
    try {
      const [p, o] = await Promise.all([platform<any[]>('/plans'), platform<any[]>('/orders')]);
      setPlans(p);
      setOrders(o);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void reload();
  }, []);
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold">自分の予定</h1>
      <ErrorMessage text={error} />
      <Reservations />
      {!plans && !error && <Loading />}
      {plans?.length === 0 && <p>保存した予定はありません。</p>}
      {plans?.map((p) => (
        <article key={p.id} className="rounded-xl border p-5 space-y-3">
          <h2 className="text-xl font-semibold">{p.title}</h2>
          <CalendarConnect planId={p.id} />
          {p.items.map((i: any, n: number) => (
            <div key={n}>
              <p>
                {i.title} · {labels[i.status] || i.status}
              </p>
              <p>
                {i.current?.start || i.start
                  ? new Date(i.current?.start || i.start).toLocaleString('ja-JP')
                  : ''}
              </p>
              {i.changed && (
                <p role="status" className="text-amber-800">
                  開催情報が変更されました。移動を再確認してください。
                </p>
              )}
              {i.current?.status === 'cancelled' && (
                <p>開催中止。交通・宿泊の取消はそれぞれご確認ください。</p>
              )}
              {i.unavailable && (
                <p>情報源から取得できなくなっています。開催状況は公式サイトで確認してください。</p>
              )}
              {i.referenceId && (
                <a href={`/activities/${encodeURIComponent(i.referenceId)}`}>
                  行き方・帰り方を確認
                </a>
              )}
            </div>
          ))}
          <div className="flex gap-4">
            <a className="underline" href={`${apiOrigin}/api/v1/plans/${p.id}/calendar.ics`}>
              カレンダーへ書き出す
            </a>
            <button
              onClick={async () => {
                try {
                  await platform(`/plans/${p.id}`, { method: 'DELETE' });
                  await reload();
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              予定から削除
            </button>
          </div>
        </article>
      ))}
      <h2 className="text-2xl font-semibold">購入した券</h2>
      {orders.map((o) => (
        <Order key={o.id} order={o} reload={reload} onError={setError} />
      ))}
      {orders.length === 0 && <p>購入した券はありません。</p>}
    </div>
  );
}
function Order({
  order: o,
  reload,
  onError,
}: {
  order: any;
  reload: () => Promise<void>;
  onError: (v: string) => void;
}) {
  const [detail, setDetail] = useState<any>(),
    [qr, setQr] = useState('');
  async function check() {
    try {
      const d = await platform<any>(`/orders/${o.id}`);
      setDetail(d);
      if (d.ticket) {
        const QRCode = await import('qrcode');
        setQr(await QRCode.toDataURL(d.ticket.token));
      } else setQr('');
      await reload();
    } catch (e) {
      onError((e as Error).message);
    }
  }
  return (
    <article className="border rounded-xl p-5 space-y-3">
      <h3>
        {o.product.title} · ¥{o.amount}
      </h3>
      <p>{labels[detail?.status || o.status]}</p>
      <p>参照用一回券 · 実交通事業者での利用は検証されていません。</p>
      <button className="border rounded p-2" onClick={check}>
        状態を確認・券を表示
      </button>
      {detail?.ticket && (
        <button
          className="border rounded p-2"
          onClick={() => navigator.clipboard.writeText(detail.ticket.token)}
        >
          券コードをコピー
        </button>
      )}
      {qr && <img src={qr} width={220} height={220} alt="乗車認証用QRコード" />}
      {o.status === 'pending' && o.checkout_url && <a href={o.checkout_url}>支払いへ進む</a>}
      {(detail?.status || o.status) === 'paid' && (
        <button
          className="border rounded p-2 ml-3"
          onClick={async () => {
            try {
              await platform(`/orders/${o.id}/refunds`, { method: 'POST', body: '{}' });
              setQr('');
              setDetail(undefined);
              await reload();
            } catch (e) {
              onError((e as Error).message);
            }
          }}
        >
          未使用券を取消・返金する
        </button>
      )}
    </article>
  );
}
