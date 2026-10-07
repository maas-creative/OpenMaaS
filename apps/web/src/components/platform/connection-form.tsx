'use client';
import { useState } from 'react';
interface Definition {
  kind: string;
  implemented: boolean;
  capabilities: string[];
  required: string[];
  fields: { name: string; options?: string[] }[];
  credentialRequired: boolean;
  status: string;
}
interface Source {
  id: string;
  kind: string;
  enabled: boolean;
  label: string;
  url?: string;
  secretRef?: string;
  region: string;
  attribution: string;
  termsUrl: string;
  intervalSeconds: number;
  params: Record<string, string>;
  operations: string[];
  categories: string[];
  manual: unknown[];
  staticSourceId?: string;
}
export default function ConnectionForm({
  config,
  definitions,
  onSave,
}: {
  config: Record<string, unknown> & { sources: Source[] };
  definitions: Definition[];
  onSave: (cfg: unknown) => Promise<void>;
}) {
  const [cfg, setCfg] = useState(config),
    [error, setError] = useState('');
  const sources = cfg.sources;
  function update(index: number, patch: Partial<Source>) {
    setCfg({ ...cfg, sources: sources.map((s, i) => (i === index ? { ...s, ...patch } : s)) });
  }
  function nested(section: string, key: string, value: string) {
    const current = (cfg[section] || {}) as Record<string, string>;
    const next = { ...current };
    if (value) next[key] = value;
    else delete next[key];
    setCfg({ ...cfg, [section]: next });
  }
  const fieldClass = 'block border rounded p-2 w-full';
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">接続を設定する</h2>
      <div className="grid gap-3 md:grid-cols-3">
        {['name', 'region', 'contact'].map((k) => (
          <label key={k}>
            {
              (
                { name: '表示名', region: '対象地域', contact: '問い合わせ先' } as Record<
                  string,
                  string
                >
              )[k]
            }
            <input
              className={fieldClass}
              value={String(cfg[k] || '')}
              onChange={(e) => setCfg({ ...cfg, [k]: e.target.value })}
            />
          </label>
        ))}
      </div>
      <div className="flex gap-4 flex-wrap">
        {Object.entries(cfg.features as Record<string, boolean>).map(([k, v]) => (
          <label key={k}>
            <input
              type="checkbox"
              checked={v}
              onChange={(e) =>
                setCfg({ ...cfg, features: { ...(cfg.features as object), [k]: e.target.checked } })
              }
            />
            {k}
          </label>
        ))}
      </div>
      <fieldset className="border rounded p-4 space-y-3">
        <legend>経路検索・認証</legend>
        <label>
          タイムゾーン
          <input
            className={fieldClass}
            value={String(cfg.timezone || 'Asia/Tokyo')}
            onChange={(e) => setCfg({ ...cfg, timezone: e.target.value })}
          />
        </label>
        <label>
          経路検索サービス
          <select
            className={fieldClass}
            value={(cfg.journey as { provider: string }).provider}
            onChange={(e) => nested('journey', 'provider', e.target.value)}
          >
            <option value="none">未接続</option>
            <option value="otp">OpenTripPlanner</option>
            <option value="ekispert">駅すぱあと</option>
          </select>
        </label>
        {Object.entries({
          url: '経路検索エンドポイント（HTTPS）',
          secretRef: '経路検索の資格情報参照名',
          routerId: 'OTP router ID',
        }).map(([k, label]) => (
          <label key={k}>
            {label}
            <input
              className={fieldClass}
              value={String((cfg.journey as Record<string, string>)[k] || '')}
              onChange={(e) => nested('journey', k, e.target.value)}
            />
          </label>
        ))}
        {Object.entries({
          issuer: 'OIDC issuer（HTTPS）',
          clientId: 'OIDC client ID',
          clientSecretRef: 'OIDC client secretの参照名',
        }).map(([k, label]) => (
          <label key={k}>
            {label}
            <input
              className={fieldClass}
              value={String((cfg.oidc as Record<string, string> | undefined)?.[k] || '')}
              onChange={(e) => nested('oidc', k, e.target.value)}
            />
          </label>
        ))}
        <p>
          OIDC callbackは API_ORIGIN/api/v1/auth/callback です。認証サービス側にも登録してください。
        </p>
        {Object.entries({
          admins: '管理者（issuer|subject、1行1件）',
          validators: '券認証担当者（issuer|subject、1行1件）',
        }).map(([k, label]) => (
          <label key={k}>
            {label}
            <textarea
              className={fieldClass}
              value={(cfg[k] as string[]).join('\n')}
              onChange={(e) =>
                setCfg({
                  ...cfg,
                  [k]: e.target.value
                    .split('\n')
                    .map((v) => v.trim())
                    .filter(Boolean),
                })
              }
            />
          </label>
        ))}
      </fieldset>
      {sources.map((s, i) => {
        const d = definitions.find((d) => d.kind === s.kind);
        return (
          <fieldset key={i} className="border rounded p-4 space-y-3">
            <legend>{s.label || s.id}</legend>
            <label>
              <input
                type="checkbox"
                checked={s.enabled}
                disabled={!d?.implemented}
                onChange={(e) => update(i, { enabled: e.target.checked })}
              />
              有効にする
            </label>
            {!d?.implemented && <p>正式仕様が必要です。接続実装はまだありません。</p>}
            <div className="grid gap-3 md:grid-cols-2">
              {(
                [
                  'id',
                  'label',
                  'region',
                  'attribution',
                  'termsUrl',
                  'url',
                  'secretRef',
                  'staticSourceId',
                ] as const
              ).map((k) => (
                <label key={k}>
                  {
                    {
                      id: '接続ID',
                      label: '表示名',
                      region: '地域',
                      attribution: '出典表示',
                      termsUrl: '利用条件URL',
                      url: 'フィードURL',
                      secretRef: '資格情報の参照名',
                      staticSourceId: '対応GTFSの接続ID',
                    }[k]
                  }
                  <input
                    className={fieldClass}
                    value={s[k] || ''}
                    onChange={(e) => update(i, { [k]: e.target.value || undefined })}
                  />
                </label>
              ))}
              <label>
                更新間隔（秒）
                <input
                  type="number"
                  min={60}
                  className={fieldClass}
                  value={s.intervalSeconds}
                  onChange={(e) => update(i, { intervalSeconds: Number(e.target.value) })}
                />
              </label>
              {d?.fields.map((f) => (
                <label key={f.name}>
                  {f.name}
                  {d.required.includes(f.name) ? '（必須）' : ''}
                  {f.options ? (
                    <select
                      className={fieldClass}
                      value={s.params[f.name] || ''}
                      onChange={(e) => {
                        const params = { ...s.params };
                        if (e.target.value) params[f.name] = e.target.value;
                        else delete params[f.name];
                        update(i, { params });
                      }}
                    >
                      <option value="">既定値</option>
                      {f.options.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className={fieldClass}
                      value={s.params[f.name] || ''}
                      onChange={(e) => {
                        const params = { ...s.params };
                        if (e.target.value) params[f.name] = e.target.value;
                        else delete params[f.name];
                        update(i, { params });
                      }}
                    />
                  )}
                </label>
              ))}
            </div>
            <label>
              カテゴリ（カンマ区切り）
              <input
                className={fieldClass}
                value={s.categories.join(',')}
                onChange={(e) =>
                  update(i, {
                    categories: e.target.value
                      .split(',')
                      .map((v) => v.trim())
                      .filter(Boolean),
                  })
                }
              />
            </label>
            <p>対応操作：{d?.capabilities.join(' / ')}</p>
            <div className="flex flex-wrap gap-3">
              {d?.capabilities
                .filter((k) =>
                  ['quote', 'reserve', 'lookup', 'cancel', 'fulfill', 'calendar-write'].includes(k),
                )
                .map((k) => (
                  <label key={k}>
                    <input
                      type="checkbox"
                      checked={s.operations?.includes(k) || false}
                      onChange={(e) =>
                        update(i, {
                          operations: e.target.checked
                            ? [...(s.operations || []), k]
                            : (s.operations || []).filter((x) => x !== k),
                        })
                      }
                    />
                    {k}を使用（契約・権限の確認が必要）
                  </label>
                ))}
            </div>
            {s.secretRef && (
              <p>
                登録コマンド：<code>npm run platform -- secrets {s.secretRef}</code>
                。秘密値をこの画面へ入力しないでください。
              </p>
            )}
            <button
              className="border rounded p-2"
              onClick={() => setCfg({ ...cfg, sources: sources.filter((_, index) => i !== index) })}
            >
              接続を削除
            </button>
          </fieldset>
        );
      })}
      <label>
        接続を追加
        <select
          className={fieldClass}
          value=""
          onChange={(e) => {
            if (!e.target.value) return;
            const kind = e.target.value,
              id = kind + '-' + (sources.length + 1);
            setCfg({
              ...cfg,
              sources: [
                ...sources,
                {
                  id,
                  kind,
                  label: kind,
                  enabled: false,
                  region: String(cfg.region || ''),
                  attribution: kind,
                  termsUrl: 'https://example.org/terms',
                  intervalSeconds: 300,
                  params: {},
                  operations: [],
                  categories: [],
                  manual: [],
                },
              ],
            });
          }}
        >
          <option value="">サービスを選択</option>
          {definitions.map((d) => (
            <option key={d.kind} value={d.kind}>
              {d.kind}
              {d.implemented ? '' : '（仕様待ち）'}
            </option>
          ))}
        </select>
      </label>
      {error && <p role="alert">{error}</p>}
      <button
        className="border rounded px-4 py-2"
        onClick={async () => {
          try {
            setError('');
            await onSave(cfg);
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        接続設定を検証して保存
      </button>
    </section>
  );
}
