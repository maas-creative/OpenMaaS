export class UpstreamError extends Error {
  constructor(
    public status: number,
    public retryAfter: number = 60,
  ) {
    super(`Upstream HTTP ${status}`);
  }
}
export async function request(
  url: string | URL,
  init: RequestInit = {},
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  const u = new URL(url);
  if (u.protocol !== 'https:') throw new Error('HTTPS upstream required');
  const r = await fetcher(u.toString(), {
    ...init,
    redirect: 'manual',
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok)
    throw new UpstreamError(
      r.status,
      Math.max(
        60,
        Number(r.headers.get('retry-after')) ||
          (Date.parse(r.headers.get('retry-after') || '') - Date.now()) / 1000 ||
          60,
      ),
    );
  return r;
}
export async function json(
  url: string | URL,
  init: RequestInit = {},
  fetcher: typeof fetch = fetch,
) {
  return (await request(url, init, fetcher)).json() as Promise<any>;
}
