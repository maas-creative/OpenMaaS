import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import {
  policyText,
  safeWebUrl,
  statusText,
  distanceKm,
} from '../../../libs/common/src/platform-display';
import { boundedBody } from '../src/http';
import { loadSource } from '../src/connectors';
import { SourceSchema } from '../src/model';
describe('user-facing policy and upstream bounds', () => {
  it('retires only OpenMaaS legacy caches without intercepting authenticated requests', async () => {
    const handlers: Record<string, (event: any) => void> = {};
    const deleted: string[] = [];
    let retired = false;
    let work: Promise<unknown> | undefined;
    runInNewContext(
      readFileSync(new URL('../../../apps/web/public/sw.js', import.meta.url), 'utf8'),
      {
        self: {
          addEventListener: (name: string, handler: (event: any) => void) =>
            (handlers[name] = handler),
          skipWaiting: () => {},
          registration: {
            unregister: async () => {
              retired = true;
            },
          },
        },
        caches: {
          keys: async () => ['openmaas-v1.0.0', 'other-app'],
          delete: async (name: string) => deleted.push(name),
        },
      },
    );
    handlers.activate({ waitUntil: (p: Promise<unknown>) => (work = p) });
    await work;
    expect(deleted).toEqual(['openmaas-v1.0.0']);
    expect(retired).toBe(true);
    expect(handlers.fetch).toBeUndefined();
  });

  it('shows known cancellation costs without implying unknown conditions are free', () => {
    expect(
      policyText(
        JSON.stringify([
          { start: '2026-10-10', end: '2026-10-12', amount: '500', currency: 'JPY' },
        ]),
      ),
    ).toContain('条件に記載された金額：500 JPY');
    expect(policyText({})).toContain('無料取消とは限りません');
    expect(policyText({ nonRefundable: true })).toContain('返金不可');
    expect(policyText({ cancellation: 'policy' })).toBe('policy');
    expect(policyText({ refundDetails: { amount: 500, currency: 'JPY' } })).not.toContain(
      '取消料：',
    );
    expect(policyText({ dayRangeMin: 0, dayRangeMax: 1, percentageRefundable: 0 })).not.toContain(
      'percentageRefundable',
    );
    expect(statusText('confirmed')).toBe('予約確定');
    expect(safeWebUrl('javascript:alert(1)')).toBeUndefined();
    expect(safeWebUrl('https://user:secret@example.org')).toBeUndefined();
  });
  it('separates Tokyo from New York and retains nearby locations', () => {
    expect(distanceKm({ lat: 35.68, lon: 139.76 }, { lat: 40.7, lon: -74 })).toBeGreaterThan(10000);
    expect(distanceKm({ lat: 35.68, lon: 139.76 }, { lat: 35.681, lon: 139.76 })).toBeLessThan(1);
  });
  it('cancels a body with no content-length as soon as the decoded bound is exceeded', async () => {
    let cancelled = false;
    const body = new ReadableStream({
      start(c) {
        c.enqueue(new Uint8Array(6));
        c.enqueue(new Uint8Array(6));
      },
      cancel() {
        cancelled = true;
      },
    });
    await expect(boundedBody(new Response(body), 10)).rejects.toThrow('exceeds limit');
    expect(cancelled).toBe(true);
    expect(await boundedBody(new Response('small'), 10)).toEqual(new TextEncoder().encode('small'));
  });
  it('rejects a repeated Luma cursor without publishing partial data', async () => {
    const source = SourceSchema.parse({
      id: 'luma',
      kind: 'luma',
      label: 'Luma',
      secretRef: 'LUMA_KEY',
      attribution: 'Luma',
      termsUrl: 'https://example.org',
    });
    let requests = 0;
    const fetcher = async () => {
      requests++;
      return Response.json({ entries: [], has_more: true, next_cursor: 'same' });
    };
    await expect(
      loadSource(source, { LUMA_KEY: 'dummy' } as any, fetcher as typeof fetch),
    ).rejects.toThrow('pagination');
    expect(requests).toBe(2);
  });
});
