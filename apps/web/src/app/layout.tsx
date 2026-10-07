import type { Metadata } from 'next';
import './globals.css';
import { PlatformHeader } from '@/components/platform/shell';
export const metadata: Metadata = {
  title: 'OpenMaaS',
  description: '移動と、その目的になるサービスを組み合わせる',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <PlatformHeader />
        <main className="mx-auto max-w-6xl p-5 sm:p-8">{children}</main>
        <footer className="mx-auto max-w-6xl border-t p-5 text-sm text-muted-foreground">
          <p>OpenMaaS © 2024–2026 MaaS Creative Co. Ltd</p>
          <p>
            無保証で提供します。
            <a
              className="underline"
              href="https://github.com/maas-creative/OpenMaaS/blob/main/LICENSE"
            >
              AGPL-3.0-or-laterの条件に従って改変・再配布できます。
            </a>
          </p>
        </footer>
      </body>
    </html>
  );
}
