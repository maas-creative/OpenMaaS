/** Display only understood provider fields. Unknown policy data never implies free cancellation. */
export function policyText(value: unknown): string {
  if (typeof value === 'string') {
    try {
      return policyText(JSON.parse(value));
    } catch {
      return value;
    }
  }
  const lines: string[] = [];
  function visit(v: any, depth = 0) {
    if (!v || depth > 6) return;
    if (Array.isArray(v)) {
      v.slice(0, 100).forEach((x) => visit(x, depth + 1));
      return;
    }
    if (typeof v !== 'object') return;
    const parts: string[] = [];
    for (const k of [
      'description',
      'text',
      'cancellationReasonText',
      'cancellation',
      'cancellationPolicy',
    ])
      if (typeof v[k] === 'string') parts.push(v[k]);
    if (v.start || v.end) parts.push(`適用期間：${v.start || '指定なし'}〜${v.end || '指定なし'}`);
    if (v.deadline) parts.push(`取消期限：${v.deadline}`);
    if (v.amount !== undefined && v.currency)
      parts.push(`条件に記載された金額：${v.amount} ${v.currency}`);
    if (v.percent !== undefined) parts.push(`取消料：料金の${v.percent}%`);
    if (v.nights !== undefined) parts.push(`取消料：${v.nights}泊分`);
    if (v.refundAmount !== undefined && v.currency)
      parts.push(`返金額：${v.refundAmount} ${v.currency}`);
    if (v.percentageRefundable !== undefined) parts.push(`返金割合：${v.percentageRefundable}%`);
    if (v.refundPercentage !== undefined) parts.push(`返金割合：${v.refundPercentage}%`);
    if (v.dayRangeMin !== undefined || v.dayRangeMax !== undefined)
      parts.push(`利用日の${v.dayRangeMin ?? 0}〜${v.dayRangeMax ?? '指定なし'}日前`);
    if (v.nonRefundable === true || v.non_refundable === true) parts.push('返金不可');
    if (parts.length) lines.push(parts.join(' · '));
    Object.values(v)
      .filter((x) => x && typeof x === 'object')
      .forEach((x) => visit(x, depth + 1));
  }
  visit(value);
  return (
    [...new Set(lines)].join('\n') ||
    '取消料・返金条件は提供元で確認してください。無料取消とは限りません。'
  );
}
export function statusText(status: string): string {
  return (
    (
      {
        saved: '未予約',
        external: '外部サイトへ案内',
        unknown: '結果不明・再照会が必要',
        pending: '手続き中',
        confirmed: '予約確定',
        cancel_pending: '取消処理中',
        cancelled: '取消済み',
        rejected: '申込み不成立',
        completed: '利用終了',
        paid: '利用可能',
        used: '使用済み',
        refund_pending: '返金処理中',
        refunded: '返金済み',
        expired: '期限切れ',
        queued: '処理待ち',
        running: '処理中',
        failed: '処理失敗',
        done: '処理完了',
        ok: '接続済み',
        unconnected: '未接続',
        disabled: '停止中',
        error: '取得失敗',
        rate_limited: '取得を一時停止',
      } as Record<string, string>
    )[status] || '状態を確認してください'
  );
}
export function safeWebUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !u.username && !u.password ? u.href : undefined;
  } catch {
    return;
  }
}
export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const rad = Math.PI / 180;
  const h =
    Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lon - a.lon) * rad) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}
