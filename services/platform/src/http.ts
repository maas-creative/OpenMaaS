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
  return JSON.parse(
    new TextDecoder().decode(await boundedBody(await request(url, init, fetcher))),
  ) as any;
}

/** Bound decoded bodies even when Content-Length is missing or compressed. */
export async function boundedBody(response: Response, maxBytes = 16 * 1024 * 1024) {
  if (Number(response.headers.get('content-length')) > maxBytes)
    throw new Error('Upstream response exceeds limit');
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw new Error('Upstream response exceeds limit');
      chunks.push(value);
    }
  } catch (e) {
    await reader.cancel();
    throw e;
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}
