# OpenMaaS platform

OpenMaaSは、目的になる活動と移動を組み合わせるオープンソースソフトウェアです。AGPL-3.0-or-laterで、コードをGitHubで公開しています。地域ごとに同じ検索・予定保存・接続処理を作り直す負担を減らします。OpenMaaS自身が交通・宿泊・イベントを運営したり、一括予約の成立を保証したりするものではありません。

## 提供する機能

- `/explore`：イベント・体験・施設・宿泊を探す。情報源、更新状態、停留所の出発時刻、運行情報、シェア交通の空き状況を表示。
- `/activities/:id`：活動の公式申込み先と、開始前の到着検索・終了後の帰路検索。オンライン、座標欠損、終了時刻欠損を区別。余裕時間の初期値15分。
- `/my-plans`：活動・往路・帰路・宿泊を未予約の予定として保存。開催時刻変更・中止・取得対象からの消失を表示。ICS出力。
- `/catalog`、`/validate`：導入先商品のStripe Checkoutと、参照用一回券のオンライン一回認証・未使用券の返金。
- `/connections`：管理者がフォームで接続、地域、カテゴリ、更新間隔、経路検索、OIDC、担当者と対応操作を設定。接続診断、取得状態、未確定予約・取消ジョブ・返金ジョブ、監査履歴。詳細設定はJSON取込・出力も使用できます。
- `/services`：Square・Uber・Viator・Booking.com・Expediaの空き／見積と、設定・契約で許可された予約。予約は自分の予定へ関連付け、照会・取消条件確認・取消ができます。
- `/my-plans`のGoogle Calendar連携：利用者OAuthで所有カレンダーを選び、予定を登録・更新。未予約の予定は仮予定として登録します。

外部申込みリンクの閲覧は予約確認にはなりません。Luma等の購入は提供元へ案内し、OpenMaaSのStripeへ流しません。接続能力はコードで固定され、設定から未知の予約・取消操作を追加できません。

## 構成

`services/platform`：TypeScript・Honoの単一Cloudflare Worker、D1、R2、Scheduledイベント。`apps/web`：Next.js 15 + OpenNext。既存のNestJSサービス、Docker構成は旧実装の参考として残っています。標準の`npm run build/test/dev`は新構成を対象にします。旧画面URLは新画面へ移行しています。

活動は`Activity`、開催日時・場所は`/occurrences`、利用操作は`Action`、利用者の組合せは`Plan`です。`contracts.ts`に`Offer`・`Reservation`・`Entitlement`の拡張契約があります。初期の情報連携に架空の確定予約を生成しません。

## ローカル起動

Node.js 22.16以上、npmを使用します。

```sh
npm ci
npm run db:local --workspace=@openmaas/platform
npm run dev
# 別ターミナル
npm run dev:web
```

Webは3000、APIは8787です。既存環境変数がある場合は`NEXT_PUBLIC_PLATFORM_API_URL=http://localhost:8787`を指定します。
`services/platform/.dev.vars`へ`BOOTSTRAP_TOKEN`を設定し、導入例JSONを編集して初回設定します。秘密値はJSONへ書かずWorkerの秘密情報に設定します。

```sh
npm run config:validate -- examples/platform/event-transit.json
OPENMAAS_API_ORIGIN=http://localhost:8787 OPENMAAS_BOOTSTRAP_TOKEN=YOUR_LOCAL_TOKEN npm run config:bootstrap -- examples/platform/event-transit.json
```

初回設定済みならbootstrapは409です。以後はOIDC管理者だけが設定を更新できます。初回から`oidc`と`admins`を設定してください。管理者識別子は`https://issuer.example|subject`です。OIDC無しでも公開検索は使えますが、予定保存・購入・設定更新はできません。認証を模擬ログインで代替しません。

四つのJSONは、イベント交通・観光周遊・生活交通・券販売の出発点です。フィードURL、地域、事業者表示、対象期間・カレンダー、OIDC、接続先の権限を導入先が決めます。商用接続は初期状態で無効です。JSON Schemaは`examples/platform/config.schema.json`、検証はZodが実行します。

## Cloudflare導入

四構成の初期設定とD1/R2・API/Webの配置をまとめるCLIを追加しました。[導入手順](deployment.md)を参照してください。`npm run platform -- init event-transit`、`validate`、`deploy`、`secrets SECRET_REF`、`doctor`を提供します。下記は手動で配置する場合です。

1. D1とR2を作成し、`services/platform/wrangler.jsonc`のID・名前を置き換える。
2. 本番の`APP_ORIGIN`と`API_ORIGIN`を設定。両者は同一サイト内のHTTPS（例：app.example.orgとapi.example.org）に配置する。Lax Cookieのため、無関係なサイト間の構成は対応しない。
3. `npm run db:remote --workspace=@openmaas/platform`でマイグレーション。
4. `wrangler secret put BOOTSTRAP_TOKEN`、必要なAPIキー、`TICKET_SECRET`、`STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`を設定。TICKET_SECRETは十分長いランダム値。既発行券が有効な間は同じ値を維持してください。資格情報を管理画面・公開JSONへ入力しない。
5. `npm run deploy --workspace=@openmaas/platform`。初回設定のOIDC callbackは`API_ORIGIN/api/v1/auth/callback`。認可コード、PKCE、nonce、署名・issuer・audience検証を行う。導入先IdPにcallbackを登録。
6. Webを`NEXT_PUBLIC_PLATFORM_API_URL`を指定して`npm run deploy --workspace=@openmaas/web`で配置。cronが接続ごとの更新間隔と429の再試行待機を適用する。
7. StripeのWebhook宛先は`API_ORIGIN/api/v1/webhooks/stripe`。Checkout完了・非同期成功・失効イベントを登録。Stripeテストモードで実行してから本番商品を導入先の判断で設定する。

クラウド資源の作成・公開デプロイは今回実行していません。

## データ接続

[接続台帳](connectors.md)に公式仕様、権限、対象範囲、保存・表示上の確認事項を記録しています。Lumaカレンダー、connpass v2、楽天施設／空室検索、GTFS ZIP、GTFS-RT protobuf、GBFS 2.3/3.0、ODPT駅・時刻表・運行情報、OTP GraphQL、駅すぱあと、ICS、Stripeを実装しています。追加接続はEventbrite、Ticketmaster、TomTom、Square、Uber、Viator、Booking.com、Expedia、Google Calendarです。Masabiは正式仕様取得待ちです。

- Lumaはキーに許可されたカレンダーの公開イベントのみ取得。非公開会場座標・参加者名簿・オンライン会議URLは保存しない。`params.scope: organization`で権限のある組織の公開イベントを取得できます。`params.calendarIds`は対象カレンダーIDをカンマ区切りで限定します。APIに明確な中止フィールドがない応答は中止と推測せず、消失として表示する。
- `manual`接続で地域の体験・施設・配車・駐車場の案内を登録可能。`status: cancelled`で明示的中止を反映。
- connpassのページ取得は1秒以上隔てる。フィード全体を公開する権利と必要なクレジットは接続時に確認。
- 楽天の`params.applicationId`と`secretRef`で参照するaccessKeyが必要。施設検索はhotelNo/地域等、空室検索はcheckinDate、checkoutDate等を設定。空室結果は予約の保証ではない。利用者は画面でチェックイン・チェックアウト・大人人数を指定できます。結果は接続の更新間隔だけキャッシュし、期限切れは再検索してください。
- OTPは現在のGTFS GraphQL `planConnection`。`journey.url`は完全なエンドポイント例`https://otp.example.org/otp/gtfs/v1`。旧RESTは廃止済み。実際の導入先OTPスキーマと探索結果を接続試験で確認。
- 大きなGTFSはローカルCLIで検証・SQLを生成：`npm run import:gtfs --workspace=@openmaas/platform -- /path/feed.zip SOURCE_ID /tmp/import.sql`。その後platformディレクトリで`wrangler d1 execute DB --local --file /tmp/import.sql`（本番はremote）。新バージョンを書き終わってから公開版を切替。R2保管を必要とする導入は元ZIPを別途R2へ投入。大規模GTFSでは接続の`params.ingestion`を`cli`に設定してcron取得を停止します。Worker取得は10,000行、圧縮50MB、展開150MBまで、CLIは展開1GBまで。大量データのD1容量・CPUは導入時に見積もる。
- GTFS-RTは対応するGTFS source IDと発行元の同一性を設定する。protobuf読み込みだけで別事業者のデータを結合しない。経路探索エンジンのGTFS/RT投入は外部OTP側で行う。

## 取引と障害復旧

価格はサーバー側商品設定から採用。ownerごとのIdempotency-KeyとStripeキーで重複Checkoutを防止。決済の確定はWebhook署名だけでなくStripeへの再照会、金額・通貨・Checkoutとの照合を行います。Webhook未完了と保留注文はcronで再照会。参照券の認証画面ではQRを読む機器から得た券コード、または利用者画面のコピーしたコードを入力します。カメラ読取は同梱していません。Checkout作成時の応答不明は同じ利用者・同じキーで再試行できます。安全な再試行期間は23時間までとし、それを超える応答不明はStripe側との管理者照合を要求して重複作成を防ぎます。

券は使用・返金開始をD1条件付き更新で排他的に処理します。返金開始後は利用不可。返金ジョブは同じStripe冪等キーで再試行し、失敗を返金済みと表示しません。返金が恒久失敗した場合は管理者がStripe側の理由と取引を確認してください。まとめて取消する操作は提供しません。

追加サービスの取引は、提供元の決済・予約処理を使用します。SquareのBookingsは支払完了を意味しません。Viatorは提供元iframeの支払トークンを使用します。Booking.com／Expediaの対応支払モードは台帳・導入手順に記載しています。Stripeへ代理課金しません。

見積はサーバー取得価格・有効期限・所有者に結び付け、予約要求はD1に保存してから送ります。応答不明の予約を自動で再作成せず、照会で確定させます。Booking.com／Expediaは導入先参照番号による復旧も実装。未知のSquare／Uber作成結果で提供元IDがない場合は、管理者が提供元と照合する必要があります。取消は永続ジョブで再試行し、Viatorの取消見積が変わった場合は利用者の再確認を求めます。Square／Uberの署名付きWebhookは通知の状態を信用せずAPIへ再照会します。

実商用アカウントでの予約・販売・発券は未検証です。Masabiは正式仕様取得待ちで未実装。参照券は交通事業者の乗車権を保証しません。

## 拡張

新しい情報接続は`connectors.ts`へ正規化と能力を追加し、SourceSchema、台帳、fixturesを更新します。画面はActivity/Actionを読むため追加サービスごとの別画面は不要です。予約接続は`contracts.ts`と`test/reservation-contract.ts`のsandbox契約試験を参照し、保留・確定・応答不明、見積の有効期限、事業者決済／導入先決済を区別します。検索しか許されない契約で予約メソッドを有効にしないこと。受付時刻は開始時刻と別の`receptionStart`で保持します。予約をせず保存した予定のICSはTENTATIVEとし、宿泊の検索日付は時刻を推測せず終日予定で出力します。

`npm test`、`npm run build`、`npm run lint`が標準検証です。[試験結果](verification.md)にはfixtureと公開実取得を分けて記録します。
