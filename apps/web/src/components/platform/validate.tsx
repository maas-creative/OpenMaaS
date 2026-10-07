'use client';
import { useState } from 'react';
import { platform } from '@/lib/platform';
import { ErrorMessage } from './shell';
export default function Validate() {
  const [token, setToken] = useState(''),
    [message, setMessage] = useState(''),
    [error, setError] = useState('');
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        try {
          const r = await platform<any>('/tickets/validate', {
            method: 'POST',
            body: JSON.stringify({ token }),
          });
          setMessage(`利用を確認しました：${r.id}`);
          setToken('');
        } catch (e) {
          setError((e as Error).message);
        }
      }}
    >
      <h1 className="text-3xl font-bold">乗車確認</h1>
      <p>QRリーダーから読み取った認証トークンを入力してください。</p>
      <label className="block">
        認証トークン
        <input
          className="block border rounded p-3 w-full"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          required
          pattern="[a-f0-9]{64}"
        />
      </label>
      <button className="bg-blue-700 text-white rounded px-4 py-2">利用を確認</button>
      <ErrorMessage text={error} />
      {message && <p role="status">{message}</p>}
    </form>
  );
}
