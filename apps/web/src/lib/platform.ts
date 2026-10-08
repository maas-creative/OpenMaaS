export const apiOrigin = process.env.NEXT_PUBLIC_PLATFORM_API_URL || 'http://localhost:8787';
export async function platform<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiOrigin}/api/v1${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });
  const body = await response.json();
  if (!response.ok)
    throw new Error(
      response.status === 401 ? 'ログインしてください' : body.error || '接続できません',
    );
  return body as T;
}
export interface Activity {
  id: string;
  title: string;
  description: string;
  category: string;
  region: string;
  sourceId: string;
  place: { name: string; address?: string; lat?: number; lon?: number };
  detailStatus?: string;
  price?: { amount: number; currency: string; conditions: string };
  bookingWindow?: { checkinDate: string; checkoutDate: string; adults: number };
  receptionStart?: string;
  start?: string;
  end?: string;
  online: boolean;
  status: string;
  actions: { type: string; label: string; url: string }[];
  fetchedAt: string;
}
export interface Session {
  authenticated: boolean;
  name?: string;
  admin?: boolean;
  validator?: boolean;
}
export interface PublicConfig {
  name: string;
  region: string;
  contact: string;
  features: { activities: boolean; transit: boolean; accommodations: boolean; commerce: boolean };
  journeyProvider: string;
}
