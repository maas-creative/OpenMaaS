# Platform API v1

基点：`API_ORIGIN/api/v1`。JSON、公開読取はログイン不要、保存・購入はOIDCセッション必須、管理APIは管理者、券認証は管理者またはvalidator。変更リクエストには導入先APP_ORIGINのOriginを要求します。資格情報は公開レスポンスに含めません。

| 操作                                                                       | 用途                                                                                | 権限                          |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------- |
| GET config / sources                                                       | 公開設定・能力・取得状態・停止状態・帰属                                            | 公開                          |
| GET activities?q=&category=&region=&date=                                  | Activity一覧。dateは導入timezoneの開催日                                            | 公開                          |
| GET activities/:id / occurrences                                           | 詳細と特定開催日時・場所・中止・オンライン状態                                      | 公開                          |
| GET transit / transit/departures?stopId=&date=                             | 停留所・路線・運行情報、GTFS運行日の出発時刻（24時超を含む）                        | 公開                          |
| GET shared-mobility                                                        | GBFSのポート・車両・状態・更新日時                                                  | 公開                          |
| GET accommodations                                                         | 宿泊カテゴリ一覧                                                                    | 公開                          |
| POST accommodations/search                                                 | 有効な楽天接続にチェックイン・アウト・大人人数を渡す。検索結果のみ。更新間隔でcache | 公開、検索レート制限          |
| POST journeys                                                              | Activityの会場へ到着、または終了後に出発。OTP/駅すぱあと                            | 公開、検索レート制限          |
| GET / POST plans                                                           | 所有者の予定一覧・作成                                                              | ログイン                      |
| PUT / DELETE plans/:id                                                     | 所有者の予定を更新・削除                                                            | ログイン                      |
| GET plans/:id/calendar.ics                                                 | 現行時刻と場所をICSへ出力                                                           | 所有者                        |
| GET products                                                               | 導入先の有効商品                                                                    | 公開                          |
| POST orders                                                                | サーバー価格でStripe Checkout。Idempotency-Keyヘッダー必須                          | ログイン                      |
| GET orders / orders/:id                                                    | 自己の注文、確定状態再照会、一回券表示                                              | 所有者                        |
| GET tickets                                                                | 自己の参照券。valid/used/refund_pending等を区別                                     | 所有者                        |
| POST orders/:id/refunds                                                    | 未使用・期限内の券の取消と返金ジョブ開始                                            | 所有者                        |
| POST tickets/validate                                                      | コードのオンライン一回認証                                                          | validator                     |
| POST webhooks/stripe                                                       | 署名・時刻検証、Stripe照会で確定                                                    | Stripe署名                    |
| GET / PUT admin/config                                                     | 導入設定。現管理者を残す                                                            | 管理者                        |
| POST admin/sources/:id/sync                                                | 認証・取得・正規化・公開版切替。更新間隔内は待機                                    | 管理者                        |
| POST admin/sources/:id/import                                              | 小規模GTFS検証済みレコードの投入。大規模はCLI                                       | 管理者                        |
| GET admin/transactions / admin/orders.csv                                  | 取引・未完了job・監査・CSV                                                          | 管理者                        |
| POST admin/reconcile                                                       | 決済・返金の再照会                                                                  | 管理者                        |
| POST bootstrap                                                             | 初回だけの導入設定                                                                  | Bootstrap秘密鍵               |
| GET auth/login / callback / session、POST auth/logout                      | OIDC認証・セッション                                                                | 操作に応じた状態・Cookie      |
| GET service-connections                                                    | 有効接続・設定済み操作・sandbox等の区分                                             | 公開（秘密値なし）            |
| POST services/search                                                       | Booking.com／Expedia施設・料金、Viator空き照会                                      | 公開・検索レート制限          |
| POST offers                                                                | Square／Uber／Viator／Booking.com／Expediaの見積                                    | ログイン・quote設定・接続診断 |
| POST offers/:id/prepare                                                    | Viator予約保持・提供元支払セッション                                                | 所有者・reserve設定           |
| GET / POST reservations                                                    | 一覧／作成。Idempotency-Key必須                                                     | ログイン                      |
| GET reservations/:id、POST reservations/:id/refresh                        | 予約状態を提供元へ照会                                                              | 所有者・lookup設定            |
| GET reservations/:id/cancellation、POST reservations/:id/cancel            | 取消条件・digest確認後に永続取消処理                                                | 所有者・cancel設定            |
| GET admin/connectors / admin/connections、POST admin/connections/:id/check | 接続定義・診断一覧・診断                                                            | 管理者                        |
| GET admin/connections/:id/orders                                           | Eventbrite注文ID・状態。参加者名簿なし                                              | 管理者                        |
| GET integrations/:id/google/authorize / integrations/:id/google/calendars  | 利用者認可・所有カレンダー                                                          | ログイン                      |
| GET integrations/google/callback                                           | 所有者・一回限りOAuth stateを照合                                                   | ログイン＋Google code         |
| POST integrations/:id/google/plans/:planId、DELETE integrations/:id/google | 予定登録／更新、認可解除                                                            | 所有者                        |
| POST webhooks/providers/:sourceId                                          | Square／Uber署名・重複検証、API再照会                                               | 提供元署名                    |

## 例

到着検索（時間はActivityから算出、余裕15分）：

```json
{
  "activityId": "luma:event-id",
  "direction": "outbound",
  "origin": { "lat": 35.68, "lon": 139.76 },
  "bufferMinutes": 15
}
```

終了が不明な帰路は利用者指定日時を必須とします。オンライン／座標欠損は422、中止は409、経路接続無しは422です。

```json
{
  "activityId": "luma:event-id",
  "direction": "return",
  "origin": { "lat": 35.68, "lon": 139.76 },
  "dateTime": "2026-10-10T17:00:00+09:00"
}
```

空室検索（地域・施設条件はsource params、キーはWorker secrets）：

```json
{ "sourceId": "rakuten", "checkinDate": "2026-10-10", "checkoutDate": "2026-10-11", "adults": 2 }
```

未予約の予定保存：

```json
{
  "title": "イベントと宿泊",
  "items": [
    { "type": "activity", "referenceId": "luma:event-id", "title": "イベント", "status": "saved" },
    {
      "type": "accommodation",
      "referenceId": "rakuten:hotel-id",
      "title": "ホテル",
      "status": "external"
    }
  ]
}
```

`referenceId`は検索結果の実IDを使用します。APIがActivityのsnapshotを取り、再表示時に現在の開催時刻・会場・オンライン・中止状態との差を返します。`saved`、`external`を確定予約と扱いません。単一Planに関連付けても共同取引は作りません。`outbound`、`return`の`data`には検索結果を保存できます。API予約の状態は提供元Reservation接続の照会によって更新します。外部リンクから戻っただけでは確定にしません。

標準の検索・情報接続モデルは`src/model.ts`、対応能力・設定スキーマは`src/registry.ts`、固有取引は`src/transactions.ts`・`src/merchant.ts`です。全サービスへの予約・発券メソッドの実装を義務付けません。設定済み操作と実接続の検証は区別します。[導入手順](deployment.md)に対応支払モードと復旧の制限を記載しています。
