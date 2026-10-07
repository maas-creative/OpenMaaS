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
      </body>
    </html>
  );
}
