'use client';
import { useEffect, useRef, useState } from 'react';
import { platform } from '@/lib/platform';
import { ErrorMessage } from './shell';
export default function Catalog() {
  const [products, setProducts] = useState<any[]>(),
    [error, setError] = useState(''),
    [busy, setBusy] = useState('');
  const keys = useRef<Record<string, string>>({});
  useEffect(() => {
    platform<any[]>('/products')
      .then(setProducts)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold">乗車券</h1>
      <ErrorMessage text={error} />
      {!products && !error && <p role="status">商品を読み込んでいます…</p>}
      {products?.length === 0 && !error && <p>販売可能な商品はありません。</p>}
      {products?.map((p) => (
        <article key={p.id} className="border rounded-xl p-5 space-y-2">
          <h2>
            {p.title} · ¥{p.amount}
          </h2>
          <p>{p.terms}</p>
          <p>
            販売元：{p.seller} · 問い合わせ：{p.contact}
          </p>
          {p.reference !== false && (
            <p>参照用の券です。交通事業者の乗車券としては利用できません。</p>
          )}
          <button
            disabled={!!busy}
            className="bg-blue-700 text-white rounded px-4 py-2 disabled:opacity-50"
            onClick={async () => {
              setBusy(p.id);
              setError('');
              try {
                keys.current[p.id] ||=
                  sessionStorage.getItem(`openmaas-checkout:${p.id}`) || crypto.randomUUID();
                sessionStorage.setItem(`openmaas-checkout:${p.id}`, keys.current[p.id]);
                const order = await platform<any>('/orders', {
                  method: 'POST',
                  headers: { 'Idempotency-Key': keys.current[p.id] },
                  body: JSON.stringify({ productId: p.id }),
                });
                if (order.status === 'pending') window.location.assign(order.checkoutUrl);
                else {
                  sessionStorage.removeItem(`openmaas-checkout:${p.id}`);
                  delete keys.current[p.id];
                  window.location.assign('/my-plans');
                }
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy('');
              }
            }}
          >
            {busy === p.id ? '処理中…' : '条件を確認して購入する'}
          </button>
        </article>
      ))}
    </div>
  );
}
