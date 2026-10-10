'use client';
import { useEffect, useRef, useState } from 'react';
import { policyText, statusText } from '@openmaas/common/platform-display';
import PlacePicker from './place-picker';
import Script from 'next/script';
import { platform } from '@/lib/platform';
import { ErrorMessage } from './shell';
interface Connection {
  id: string;
  label: string;
  kind: string;
  operations: string[];
  paymentMode?: string;
  productCodes?: string[];
  environment: string;
}
interface Offer {
  id: string;
  sourceId: string;
  title: string;
  amount: number | null;
  currency: string | null;
  terms: string;
  expiresAt: string;
  prepareRequired?: boolean;
  bookingQuestions?: {
    id: string;
    label: string;
    hint?: string;
    type: string;
    required: string;
    travelerNum?: number;
    units?: string[];
    allowedAnswers?: string[];
  }[];
}
const names: Record<string, string> = {
  serviceVariationId: 'サービス',
  start: '受付開始',
  end: '受付終了',
  pickupLat: '乗車地の緯度',
  pickupLon: '乗車地の経度',
  dropoffLat: '降車地の緯度',
  dropoffLon: '降車地の経度',
  productCode: '体験',
  travelDate: '利用日',
  adults: '大人人数',
  checkin: 'チェックイン',
  checkout: 'チェックアウト',
  first: '名',
  last: '姓',
  email: 'メール',
  phone: '電話番号（国番号付き）',
  cardNumber: 'カード番号',
  cardCvc: 'セキュリティコード',
  cardMonth: '有効期限（月）',
  cardYear: '有効期限（西暦）',
  country: '国コード（例 JP）',
  city: '市区町村',
  line: '住所',
  postCode: '郵便番号',
  countryCode: '電話の国番号',
  number: '電話番号（国番号を除く）',
  paymentTiming: '支払時期',
};
export default function Services() {
  const [connections, setConnections] = useState<Connection[]>([]),
    [selected, setSelected] = useState(''),
    [fields, setFields] = useState<Record<string, string>>({ adults: '1' }),
    [activities, setActivities] = useState<any[]>([]),
    [inventory, setInventory] = useState<any[]>([]),
    [offers, setOffers] = useState<Offer[]>([]),
    [offer, setOffer] = useState<Offer>(),
    [prepared, setPrepared] = useState<any>(),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [plans, setPlans] = useState<any[]>([]),
    [planId, setPlanId] = useState('');
  const payment = useRef<any>(null),
    requestKey = useRef(''),
    [scriptReady, setScriptReady] = useState(false);
  const connection = connections.find((c) => c.id === selected);
  useEffect(() => {
    Promise.all([platform<Connection[]>('/service-connections'), platform<any[]>('/activities')])
      .then(([c, a]) => {
        setConnections(c.filter((c) => c.kind !== 'google-calendar'));
        setActivities(a);
        const param = new URLSearchParams(window.location.search).get('source');
        if (param) setSelected(param);
      })
      .catch((e) => setError(e.message));
    platform<any[]>('/plans')
      .then(setPlans)
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (prepared?.paymentSessionToken && scriptReady) {
      payment.current = (window as any).Payment.init(prepared.paymentSessionToken);
      payment.current.renderCard({
        cardElementContainer: 'provider-payment',
        onFormUpdate: () => {},
      });
    }
  }, [prepared, scriptReady]);
  const input = (key: string, type = 'text') => (
    <label key={key}>
      {names[key] || key}
      <input
        className="block border rounded p-2 w-full"
        type={type}
        step={
          ['pickupLat', 'pickupLon', 'dropoffLat', 'dropoffLon'].includes(key) ? 'any' : undefined
        }
        value={fields[key] || ''}
        required
        onChange={(e) => setFields({ ...fields, [key]: e.target.value })}
      />
    </label>
  );
  function dates() {
    return { checkin: fields.checkin, checkout: fields.checkout, adults: Number(fields.adults) };
  }
  async function search(query?: unknown) {
    if (!connection) return;
    setBusy(true);
    setError('');
    try {
      let q = query;
      if (!q && connection.kind === 'square')
        q = {
          serviceVariationId: fields.serviceVariationId,
          start: new Date(fields.start).toISOString(),
          end: new Date(fields.end).toISOString(),
        };
      if (!q && connection.kind === 'uber') {
        if (
          ['pickupLat', 'pickupLon', 'dropoffLat', 'dropoffLon'].some(
            (key) => !fields[key]?.trim() || !Number.isFinite(Number(fields[key])),
          )
        )
          throw new Error('乗車・降車地点を選択してください');
        q = {
          pickup: { latitude: Number(fields.pickupLat), longitude: Number(fields.pickupLon) },
          dropoff: { latitude: Number(fields.dropoffLat), longitude: Number(fields.dropoffLon) },
        };
      }
      if (!q && connection.kind === 'viator')
        q = {
          productCode: fields.productCode,
          travelDate: fields.travelDate,
          currency: 'USD',
          paxMix: [{ ageBand: 'ADULT', numberOfTravelers: Number(fields.adults) }],
        };
      if (!q) {
        setInventory(
          await platform<any[]>('/services/search', {
            method: 'POST',
            body: JSON.stringify({ sourceId: selected, query: dates() }),
          }),
        );
        setOffers([]);
      } else
        setOffers(
          await platform<Offer[]>('/offers', {
            method: 'POST',
            body: JSON.stringify({ sourceId: selected, query: q }),
          }),
        );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function choose(o: Offer) {
    setError('');
    setPrepared(undefined);
    payment.current = null;
    setOffer(o);
    requestKey.current = crypto.randomUUID();
    if (o.prepareRequired) {
      try {
        setPrepared(await platform(`/offers/${o.id}/prepare`, { method: 'POST', body: '{}' }));
      } catch (e) {
        setError((e as Error).message);
      }
    }
  }
  async function reserve(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!offer || !connection || busy) return;
    setBusy(true);
    setError('');
    const form = e.currentTarget,
      fd = new FormData(form);
    const f = (k: string) => String(fd.get(k) || '');
    try {
      let data: any;
      if (connection.kind === 'square')
        data = { firstName: f('first'), lastName: f('last'), email: f('email'), phone: f('phone') };
      else if (connection.kind === 'uber')
        data = { firstName: f('first'), lastName: f('last'), phone: f('phone'), email: f('email') };
      else {
        const name = { first: f('first'), last: f('last') },
          address = {
            country: f('country').toUpperCase(),
            city: f('city'),
            line: f('line'),
            postCode: f('postCode'),
          };
        if (connection.kind === 'viator') {
          if (!payment.current) throw new Error('提供元の支払フォームを読み込んでください');
          const r = await payment.current.submitForm({
            address: { country: address.country, postalCode: address.postCode },
            email: f('email'),
          });
          data = {
            name,
            email: f('email'),
            phone: f('phone'),
            paymentToken: r.paymentToken,
            answers: (offer.bookingQuestions || []).flatMap((q, index) =>
              f(`question-${index}`)
                ? [
                    {
                      question: q.id,
                      answer: f(`question-${index}`),
                      ...(q.travelerNum ? { travelerNum: q.travelerNum } : {}),
                      ...(q.units?.length ? { unit: f(`unit-${index}`) } : {}),
                    },
                  ]
                : [],
            ),
          };
        } else {
          const card = {
            number: f('cardNumber').replaceAll(' ', ''),
            cvc: f('cardCvc'),
            month: f('cardMonth'),
            year: f('cardYear'),
          };
          data =
            connection.kind === 'booking'
              ? {
                  name,
                  email: f('email'),
                  phone: f('phone'),
                  address,
                  paymentTiming: f('paymentTiming'),
                  ...(connection.paymentMode === 'card' ? { card } : {}),
                }
              : {
                  name,
                  email: f('email'),
                  phone: { countryCode: f('countryCode'), number: f('number') },
                  address,
                  card,
                };
        }
      }
      const r = await platform<any>('/reservations', {
        method: 'POST',
        headers: { 'Idempotency-Key': requestKey.current },
        body: JSON.stringify({ offerId: offer.id, input: data, ...(planId ? { planId } : {}) }),
      });
      form.reset();
      setMessage(`受付結果：${statusText(r.status)}。自分の予定で確定状況を確認してください。`);
      setOffer(undefined);
      setPrepared(undefined);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      for (const k of ['cardNumber', 'cardCvc', 'cardMonth', 'cardYear']) {
        const el = form.elements.namedItem(k) as HTMLInputElement | null;
        if (el) el.value = '';
      }
      setBusy(false);
    }
  }
  const formInput = (k: string, type = 'text') => (
    <label key={k}>
      {names[k] || k}
      <input
        required
        name={k}
        type={type}
        className="block border rounded p-2 w-full"
        autoComplete={type === 'password' ? 'off' : undefined}
      />
    </label>
  );
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold">サービスを申し込む</h1>
      <ErrorMessage text={error} />
      {message && (
        <p role="status">
          {message}{' '}
          <a className="underline" href="/my-plans">
            自分の予定へ
          </a>
        </p>
      )}
      <label>
        サービス
        <select
          className="block border rounded p-2"
          value={selected}
          onChange={(e) => {
            setSelected(e.target.value);
            setInventory([]);
            setOffers([]);
            setOffer(undefined);
            setPrepared(undefined);
          }}
        >
          <option value="">選択してください</option>
          {connections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      {connection && (
        <>
          <p>情報照会は予約ではありません。価格・条件を確認してから申し込みます。</p>
          <div className="grid md:grid-cols-2 gap-3">
            {connection.kind === 'square' && (
              <>
                <label>
                  サービス
                  <select
                    className="block border rounded p-2"
                    value={fields.serviceVariationId || ''}
                    onChange={(e) => setFields({ ...fields, serviceVariationId: e.target.value })}
                  >
                    <option value="">選択</option>
                    {activities
                      .filter((a) => a.sourceId === selected)
                      .map((a) => (
                        <option key={a.id} value={a.externalId}>
                          {a.title}
                        </option>
                      ))}
                  </select>
                </label>
                {input('start', 'datetime-local')}
                {input('end', 'datetime-local')}
              </>
            )}
            {connection.kind === 'uber' && (
              <>
                <PlacePicker
                  label="乗車地点"
                  onClear={() =>
                    setFields((f) => ({ ...f, pickupLat: '', pickupLon: '', pickupName: '' }))
                  }
                  onSelect={(p) =>
                    setFields((f) => ({
                      ...f,
                      pickupLat: String(p.lat),
                      pickupLon: String(p.lon),
                      pickupName: p.name,
                    }))
                  }
                />
                {fields.pickupName && <p>乗車：{fields.pickupName}</p>}
                <PlacePicker
                  label="降車地点"
                  onClear={() =>
                    setFields((f) => ({ ...f, dropoffLat: '', dropoffLon: '', dropoffName: '' }))
                  }
                  onSelect={(p) =>
                    setFields((f) => ({
                      ...f,
                      dropoffLat: String(p.lat),
                      dropoffLon: String(p.lon),
                      dropoffName: p.name,
                    }))
                  }
                />
                {fields.dropoffName && <p>降車：{fields.dropoffName}</p>}
              </>
            )}
            {connection.kind === 'viator' && (
              <>
                <label>
                  体験
                  <select
                    className="block border rounded p-2"
                    value={fields.productCode || ''}
                    onChange={(e) => setFields({ ...fields, productCode: e.target.value })}
                  >
                    <option value="">選択</option>
                    {connection.productCodes?.map((id) => (
                      <option key={id} value={id}>
                        {activities.find((a) => a.sourceId === selected && a.externalId === id)
                          ?.title || '体験 ' + (connection.productCodes!.indexOf(id) + 1)}
                      </option>
                    ))}
                  </select>
                </label>
                {input('travelDate', 'date')}
                {input('adults', 'number')}
              </>
            )}
            {['booking', 'expedia'].includes(connection.kind) && (
              <>
                {input('checkin', 'date')}
                {input('checkout', 'date')}
                {input('adults', 'number')}
              </>
            )}
          </div>
          <button disabled={busy} className="border rounded px-4 py-2" onClick={() => search()}>
            空き・料金を調べる
          </button>
        </>
      )}
      {inventory.map((a) => (
        <article key={a.id} className="border rounded p-4">
          <h2>{a.title}</h2>
          <a className="underline" href={`/activities/${encodeURIComponent(a.id)}`}>
            詳細・行き方
          </a>
          {a.actions?.map((x: any) => (
            <a className="ml-3 underline" href={x.url} key={x.url}>
              提供元へ
            </a>
          ))}
          {connection?.operations.includes('quote') &&
            a.bookableOptions?.map((v: any) => (
              <button
                className="block border rounded p-2 mt-2"
                key={v.id}
                onClick={() => search(v.query)}
              >
                {v.label} の最新料金・条件を確認
              </button>
            ))}
        </article>
      ))}
      {offers.map((o) => (
        <article key={o.id} className="border rounded p-4 space-y-2">
          <h2>{o.title}</h2>
          <p>
            {o.amount === null ? '料金は提供元で確認' : `${o.amount} ${o.currency}`} · 有効期限{' '}
            {new Date(o.expiresAt).toLocaleString()}
          </p>
          <p className="break-words whitespace-pre-wrap">{policyText(o.terms)}</p>
          {connection?.operations.includes('reserve') && (
            <button className="border rounded p-2" onClick={() => choose(o)}>
              この候補を申し込む
            </button>
          )}
        </article>
      ))}
      {offer && (
        <form onSubmit={reserve} className="border rounded p-5 space-y-4">
          <h2 className="text-xl font-semibold">申込み内容を確認する</h2>
          <p>
            {prepared?.amount ?? offer.amount} {offer.currency} · 支払先は提供元です
          </p>
          <p className="break-words">{policyText(prepared?.terms || offer.terms)}</p>
          <label>
            関連付ける予定
            <select
              className="block border rounded p-2"
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
            >
              <option value="">関連付けない</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>
          <div className="grid md:grid-cols-2 gap-3">
            {connection?.kind === 'square' ? (
              <>
                {['first', 'last', 'email', 'phone'].map((k) =>
                  formInput(k, k === 'email' ? 'email' : 'text'),
                )}
              </>
            ) : (
              <>
                {['first', 'last', 'email'].map((k) =>
                  formInput(k, k === 'email' ? 'email' : 'text'),
                )}
                {connection?.kind === 'expedia' ? (
                  <>
                    {formInput('countryCode')}
                    {formInput('number')}
                  </>
                ) : (
                  formInput('phone', 'tel')
                )}
              </>
            )}
            {connection &&
              ['viator', 'booking', 'expedia'].includes(connection.kind) &&
              [
                'country',
                'postCode',
                ...(connection.kind === 'viator' ? [] : ['city', 'line']),
              ].map((k) => formInput(k))}
            {offer.bookingQuestions?.map((q, index) => (
              <label key={index}>
                {q.label}
                {q.travelerNum ? `（参加者${q.travelerNum}）` : ''}
                {q.required === 'MANDATORY' ? '（必須）' : ''}
                {q.hint && <span className="block text-sm">{q.hint}</span>}
                {q.allowedAnswers?.length ? (
                  <select
                    name={`question-${index}`}
                    required={q.required === 'MANDATORY'}
                    className="block border rounded p-2"
                  >
                    <option value="">選択してください</option>
                    {q.allowedAnswers.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    name={`question-${index}`}
                    required={q.required === 'MANDATORY'}
                    type={q.type === 'DATE' ? 'date' : q.type === 'TIME' ? 'time' : 'text'}
                    className="block border rounded p-2 w-full"
                  />
                )}
                {q.units?.length && (
                  <select
                    name={`unit-${index}`}
                    aria-label={`${q.label}の単位`}
                    className="block border rounded p-2"
                  >
                    {q.units.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                )}
              </label>
            ))}
            {connection?.kind === 'booking' && (
              <label>
                支払時期
                <select required name="paymentTiming" className="block border rounded p-2">
                  <option value="pay_online_now">予約時</option>
                  <option value="pay_online_later">後日オンライン</option>
                  <option value="pay_at_the_property">
                    施設払い（保証・前払い条件は提供元の条件による）
                  </option>
                </select>
              </label>
            )}
            {connection?.paymentMode === 'card' && (
              <>
                {formInput('cardNumber', 'password')}
                {formInput('cardCvc', 'password')}
                {formInput('cardMonth')}
                {formInput('cardYear')}
              </>
            )}
          </div>
          {connection?.kind === 'viator' && prepared && (
            <>
              <Script
                src="https://checkout-assets.payments.tamg.cloud/stable/v2/payment.js"
                onReady={() => setScriptReady(true)}
              />
              <div id="provider-payment" />
            </>
          )}
          <label className="block">
            <input type="checkbox" required />
            料金・取消条件と提供元への情報送信を確認しました
          </label>
          <button
            disabled={busy || (connection?.kind === 'viator' && !prepared)}
            className="border rounded px-4 py-2"
          >
            {busy ? '処理中…' : '申込みを確定する'}
          </button>
        </form>
      )}
    </div>
  );
}
