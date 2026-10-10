export const apiOrigin = process.env.NEXT_PUBLIC_PLATFORM_API_URL || 'http://localhost:8787';
export async function platform<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiOrigin}/api/v1${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init.headers },
  }).catch(() => {
    throw new Error('接続できませんでした。通信環境を確認して再度お試しください。');
  });
  const body = await response.json().catch(() => {
    throw new Error('応答を読み取れませんでした。時間をおいて再度お試しください。');
  });
  if (!response.ok)
    throw new Error(
      response.status === 401
        ? 'ログインしてください'
        : response.status === 403
          ? 'この操作の権限がありません。'
          : response.status === 429
            ? 'アクセスが集中しています。しばらく待ってから再度お試しください。'
            : (
                {
                  'Activity not found': '活動が見つかりません。',
                  'Plan not found': '予定が見つかりません。',
                  'Reconcile before cancellation':
                    '予約結果を再照会してから取消条件を確認してください。',
                  'Confirm current cancellation terms':
                    '取消条件が更新されました。もう一度確認してください。',
                  'Journey provider is not configured':
                    'この地域では経路検索をまだ利用できません。',
                  'Search rate limit exceeded': 'しばらく待ってから検索してください。',
                } as Record<string, string>
              )[body.error] || '処理を完了できませんでした。時間をおいて再度お試しください。',
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
