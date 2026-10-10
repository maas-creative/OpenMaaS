'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiOrigin, platform, type Session, type PublicConfig } from '@/lib/platform';
export function PlatformHeader() {
  const [cfg, setCfg] = useState<PublicConfig>();
  const [session, setSession] = useState<Session>();
  useEffect(() => {
    let active = true;
    Promise.all([platform<PublicConfig>('/config'), platform<Session>('/auth/session')])
      .then(([c, s]) => {
        if (active) {
          setCfg(c);
          setSession(s);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  const navigation = (
    <>
      <Link href="/explore">出かける</Link>
      <Link href="/services">サービス申込み</Link>
      <Link href="/my-plans">自分の予定</Link>
      <a
        href={
          process.env.NEXT_PUBLIC_OPENMAAS_SOURCE_URL || 'https://github.com/maas-creative/OpenMaaS'
        }
      >
        ソースコード
      </a>
      {cfg?.features.commerce && <Link href="/catalog">乗車券</Link>}
      {session?.admin && <Link href="/connections">導入設定</Link>}
      {session?.validator && <Link href="/validate">乗車確認</Link>}
      {session?.authenticated && (
        <button
          onClick={async () => {
            await platform('/auth/logout', { method: 'POST' });
            window.location.reload();
          }}
        >
          ログアウト
        </button>
      )}
    </>
  );
  return (
    <header className="border-b bg-background">
      <nav aria-label="メイン" className="mx-auto max-w-6xl flex flex-wrap items-center gap-4 p-4">
        <Link href="/explore" className="text-xl font-bold">
          {cfg?.name || 'OpenMaaS'}
        </Link>
        <div className="hidden sm:flex flex-wrap items-center gap-5">{navigation}</div>
        <span className="ml-auto text-sm">
          {session?.authenticated ? (
            session.name
          ) : (
            <a href={`${apiOrigin}/api/v1/auth/login`}>ログイン</a>
          )}
        </span>
        <details className="relative sm:hidden">
          <summary className="cursor-pointer rounded border px-3 py-2 text-sm">メニュー</summary>
          <div className="absolute right-0 top-full z-20 mt-2 flex w-48 flex-col gap-4 rounded border bg-background p-4 shadow-lg">
            {navigation}
          </div>
        </details>
      </nav>
    </header>
  );
}

export function ErrorMessage({ text }: { text: string }) {
  return text ? (
    <p role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-red-900">
      {text}
    </p>
  ) : null;
}
export function Loading() {
  return (
    <div role="status" className="maas-loading">
      <span>読み込み中…</span>
      <div aria-hidden="true" />
      <div aria-hidden="true" />
    </div>
  );
}
