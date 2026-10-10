'use client';
import { useEffect, useRef, useState } from 'react';
import { platform, type Session } from '@/lib/platform';
import { ErrorMessage, Loading } from './shell';
export default function Validate() {
  const [token, setToken] = useState(''),
    [error, setError] = useState(''),
    [ticket, setTicket] = useState<any>(),
    [session, setSession] = useState<Session>(),
    [scanning, setScanning] = useState(false);
  const video = useRef<HTMLVideoElement>(null),
    stream = useRef<MediaStream | undefined>(undefined),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  function stop() {
    stream.current?.getTracks().forEach((t) => t.stop());
    clearTimeout(timer.current);
    setScanning(false);
  }
  useEffect(() => {
    platform<Session>('/auth/session')
      .then(setSession)
      .catch((e) => setError(e.message));
    return () => {
      stream.current?.getTracks().forEach((t) => t.stop());
      clearTimeout(timer.current);
    };
  }, []);
  async function confirm() {
    setError('');
    setTicket(undefined);
    try {
      setTicket(
        await platform('/tickets/validate', { method: 'POST', body: JSON.stringify({ token }) }),
      );
      setToken('');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function scan() {
    const Detector = (window as any).BarcodeDetector;
    if (!Detector) {
      setError(
        'このブラウザーではカメラ読取りに対応していません。QRリーダーで読み取るか券コードを貼り付けてください。',
      );
      return;
    }
    try {
      const detector = new Detector({ formats: ['qr_code'] });
      stream.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      setScanning(true);
      if (video.current) {
        video.current.srcObject = stream.current;
        await video.current.play();
      }
      const read = async () => {
        try {
          if (!stream.current?.active || !video.current) return;
          const codes = await detector.detect(video.current);
          const code = codes.find((c: any) => /^[a-f0-9]{64}$/.test(c.rawValue));
          if (code) {
            setToken(code.rawValue);
            stop();
            return;
          }
          timer.current = setTimeout(read, 300);
        } catch {
          stop();
          setError('QRコードを読み取れませんでした。再度お試しください。');
        }
      };
      void read();
    } catch {
      stop();
      setError('カメラを使用できませんでした。QRリーダーまたは券コードを使ってください。');
    }
  }
  if (!session && !error) return <Loading />;
  if (!session?.validator)
    return (
      <div>
        <h1 className="text-3xl font-bold">乗車確認</h1>
        <ErrorMessage
          text={
            error ||
            (session?.authenticated ? '乗車確認の担当者権限が必要です。' : 'ログインしてください')
          }
        />
      </div>
    );
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">乗車確認</h1>
      <ErrorMessage text={error} />
      <button className="border rounded p-3" onClick={scan}>
        カメラでQRを読み取る
      </button>
      <video ref={video} playsInline muted className={scanning ? 'w-full max-w-md' : 'hidden'} />
      {scanning && <button onClick={stop}>読取りを終了</button>}
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void confirm();
        }}
      >
        <label className="block">
          券コード
          <input
            className="block border rounded p-3 w-full"
            value={token}
            onChange={(e) => setToken(e.target.value.trim())}
            required
            pattern="[a-f0-9]{64}"
            autoComplete="off"
          />
        </label>
        <button className="bg-blue-700 text-white rounded px-4 py-2">この券の利用を確認</button>
      </form>
      {ticket && (
        <section role="status" className="border rounded p-5">
          <h2 className="text-2xl font-bold">利用を確認しました</h2>
          <p>{ticket.title}</p>
          <p>有効期限：{new Date(ticket.expiresAt).toLocaleString('ja-JP')}</p>
          {ticket.reference && <p>参照用の券です。</p>}
        </section>
      )}
    </div>
  );
}
