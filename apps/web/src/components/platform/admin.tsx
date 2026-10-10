'use client';
import { useEffect, useState } from 'react';
import { apiOrigin, platform } from '@/lib/platform';
import { ErrorMessage } from './shell';
import TransactionTable from './transaction-table';
import ConnectionForm from './connection-form';
export default function Connections() {
  const [body, setBody] = useState(''),
    [definitions, setDefinitions] = useState<any[]>([]),
    [checks, setChecks] = useState<any[]>([]),
    [sources, setSources] = useState<any[]>([]),
    [transactions, setTransactions] = useState<any>(),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  async function reload() {
    try {
      const [cfg, s, t, d, checks] = await Promise.all([
        platform('/admin/config'),
        platform<any[]>('/sources'),
        platform('/admin/transactions'),
        platform<any[]>('/admin/connectors'),
        platform<any[]>('/admin/connections'),
      ]);
      setBody(JSON.stringify(cfg, null, 2));
      setSources(s);
      setTransactions(t);
      setDefinitions(d);
      setChecks(checks);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void reload();
  }, []);
  if (!body)
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">導入設定・接続状態</h1>
        {error ? <ErrorMessage text={error} /> : <p role="status">権限を確認しています…</p>}
      </div>
    );
  async function save() {
    try {
      await platform('/admin/config', { method: 'PUT', body: JSON.stringify(JSON.parse(body)) });
      setMessage('設定を保存しました');
      await reload();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold">導入設定・接続状態</h1>
      <ErrorMessage text={error} />
      {message && <p role="status">{message}</p>}
      <p>秘密情報はCloudflare Secretsで設定し、ここには参照名だけを記載してください。</p>
      {body && definitions.length > 0 && (
        <ConnectionForm
          key={body}
          config={JSON.parse(body)}
          definitions={definitions}
          onSave={async (cfg) => {
            await platform('/admin/config', { method: 'PUT', body: JSON.stringify(cfg) });
            setMessage('設定を保存しました');
            await reload();
          }}
        />
      )}
      <details>
        <summary>詳細設定・JSON取込／出力</summary>
        <label className="block">
          地域・機能・接続・商品の設定
          <textarea
            className="block w-full font-mono border rounded p-3 mt-2"
            rows={22}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </label>
        <div className="flex flex-wrap gap-3">
          <button className="border rounded px-4 py-2" onClick={save}>
            検証して保存
          </button>
          <button
            className="border rounded px-4 py-2"
            onClick={() => {
              const a = document.createElement('a');
              a.href = URL.createObjectURL(new Blob([body], { type: 'application/json' }));
              a.download = 'openmaas-config.json';
              a.click();
              URL.revokeObjectURL(a.href);
            }}
          >
            設定を書き出す
          </button>
          <label>
            設定を読み込む
            <input
              type="file"
              accept="application/json"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) setBody(await f.text());
              }}
            />
          </label>
        </div>
      </details>
      <section>
        <h2 className="text-xl font-semibold">接続診断・取得</h2>
        {sources.map((s) => (
          <article className="border rounded p-4 mt-3" key={s.id}>
            <h3>
              {s.label} · {s.status}
            </h3>
            <p>
              {s.capabilities.join(' / ')} · 最終成功 {s.lastSuccess || '未接続'}
            </p>
            <p>{s.error}</p>
            <p>
              {checks.find((c) => c.sourceId === s.id)?.status} ·{' '}
              {checks.find((c) => c.sourceId === s.id)?.hint}
            </p>
            <button
              className="border rounded p-2 mr-3"
              onClick={async () => {
                try {
                  await platform(`/admin/connections/${s.id}/check`, {
                    method: 'POST',
                    body: '{}',
                  });
                  await reload();
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              接続だけを診断
            </button>
            <button
              className="border rounded p-2"
              onClick={async () => {
                try {
                  const result = await platform<{ status: string }>(`/admin/sources/${s.id}/sync`, {
                    method: 'POST',
                    body: '{}',
                  });
                  setMessage(
                    result.status === 'updated'
                      ? '取得・更新しました'
                      : result.status === 'query-only'
                        ? 'この接続は利用者の検索・認可時に照会します。接続診断を実行してください'
                        : result.status === 'cli-required'
                          ? 'この接続はCLIでGTFSを取り込んでください'
                          : '更新間隔または取得処理の完了を待っています',
                  );
                  await reload();
                } catch (e) {
                  setError((e as Error).message);
                  await reload();
                }
              }}
            >
              接続して取得する
            </button>
          </article>
        ))}
      </section>
      <section>
        <h2 className="text-xl font-semibold">取引・復旧</h2>
        <button
          className="border rounded p-2"
          onClick={async () => {
            try {
              await platform('/admin/reconcile', { method: 'POST', body: '{}' });
              await reload();
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          決済・返金を再照会
        </button>
        <a className="ml-4 underline" href={`${apiOrigin}/api/v1/admin/orders.csv`}>
          注文CSV
        </a>
        <TransactionTable data={transactions} />
        <details>
          <summary>取引の詳細データ</summary>
          <pre className="overflow-auto border rounded p-3 mt-3">
            {JSON.stringify(transactions, null, 2)}
          </pre>
        </details>
      </section>
    </div>
  );
}
