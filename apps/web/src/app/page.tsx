import { redirect } from 'next/navigation';
import { platform, type PublicConfig } from '@/lib/platform';
export default async function Page() {
  let home = '/explore';
  try {
    const c = await platform<PublicConfig>('/config', { cache: 'no-store' });
    if (c.features.commerce && !c.features.activities && !c.features.transit) home = '/catalog';
  } catch {}
  redirect(home);
}
