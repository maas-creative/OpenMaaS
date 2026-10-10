import { statusText } from '@openmaas/common/platform-display';
export default function TransactionTable({ data }: { data: any }) {
  return (
    <div className="space-y-5">
      {[
        ['orders', '注文'],
        ['reservations', '外部予約'],
        ['jobs', '決済・返金処理'],
        ['reservationJobs', '予約・取消処理'],
        ['audit', '操作履歴'],
      ].map(([key, title]) => (
        <section key={key}>
          <h3 className="font-semibold">{title}</h3>
          {!data?.[key]?.length ? (
            <p>対象はありません。</p>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr>
                    <th>対象</th>
                    <th>状態・操作</th>
                    <th>更新・次回処理</th>
                  </tr>
                </thead>
                <tbody>
                  {data[key].map((r: any, i: number) => (
                    <tr className="border-t" key={r.id || i}>
                      <td className="py-3">
                        {r.product_id || r.source_id || r.reservation_id || r.target || r.id}
                      </td>
                      <td>
                        {r.status ? statusText(r.status) : r.action || '記録'}
                        {r.attempts !== undefined && <span> · 試行{r.attempts}回</span>}
                      </td>
                      <td>
                        {r.updated_at || r.next_attempt || r.created_at
                          ? new Date(r.updated_at || r.next_attempt || r.created_at).toLocaleString(
                              'ja-JP',
                            )
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
