# 検証結果

実施日：2026-10-07。ローカルブランチ`codex/openmaas-composable-platform`。公開デプロイや本番購入は実施していません。

## 2026-10-09 再実行

現在のコードで以下を再実行しました。

- 自動試験56件成功。実D1上の所有者分離、予約・決済の重複要求、応答不明、取消・返金失敗と復旧を含む。提供元応答はfixture。
- API型検査成功。Web本番ビルド成功。
- 公開フィードの実取得・解析成功：BART GTFS 102,426件、MBTA GTFS-RT 1,186件、Citi Bike GBFS 5,040件。GTFS-RTはProtobuf解析であり、同一事業者の静的GTFSとの結合はこの取得試験の対象外。
- 最新の取得結果は`public-feed-results.json`に保存。
- `npm run live:smoke`で、公開Citi Bike GBFSの実同期→隔離したD1保存→アプリ公開APIを検証。5,040件取得、鮮度が有効な利用状況2,519件、匿名の予定取得は401。結果は`live-worker-results.json`。商用応答のfixtureではなく公開事業者の実応答を使用。
- Stripe・Square等の実テスト環境へ接続する資格情報は環境変数・リポジトリ設定に存在せず、サンドボックス購入・取消は未実行。

商用サービスの実アカウント、実決済、本番配置は、この再実行では確認していません。

## 検証の種類と結果

| 対象                        | 方法・証拠                                                    | 確認できたこと                                                                                                                                                                                  | 適用範囲                                                                            |
| --------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| API・D1・接続・取引         | `npm test`、`services/platform/test/platform.test.ts`         | 56件成功。実D1をMiniflareで使い、所有者分離、未予約表示、時刻・会場・中止の差分、停止、ICS、権限、取引状態を検証                                                                                | ローカルDB、提供元HTTP応答はfixture                                                 |
| 初期API接続                 | 同試験                                                        | Luma flatレスポンス・公開範囲・組織／カレンダー制限・公開詳細・通貨単位、connpassキー、楽天施設／空室、GBFS 3.0 RFC3339・多言語名、429                                                          | 公開仕様に基づく契約fixture。各商用アカウントの資格未検証                           |
| 経路                        | 同試験                                                        | OTP GraphQLの到着／出発と座標逆転。15分余裕、受付時刻、オンライン・座標欠損・終了不明・中止                                                                                                     | リクエスト構造と時間の契約。実OTP／駅すぱあと経路未検証                             |
| 認証                        | 同試験                                                        | 署名付きOIDC fixtureで認可コード・PKCE・nonce・JWT署名・issuer・audience検証、状態再利用拒否、HttpOnly session                                                                                  | 実際の導入先IdPは未接続                                                             |
| 参照券                      | 同試験                                                        | 同時・繰返し購入の冪等キー、Stripe照合金額、確定後一回認証、返金／使用の排他、応答不明再試行、返金失敗の永続ジョブ復旧、署名拒否                                                                | Stripe HTTP fixture。実Stripeテストモードも未実施                                   |
| 固有予約接続                | 同試験                                                        | Squareの同時予約一回送信、応答不明の再作成禁止、取消失敗ジョブ復旧、Viator保持・iframe token・必須質問・確定voucher、Booking native要求とカード非保存、Expedia署名・link固定ホスト・pending状態 | 固有HTTP fixtureと実D1。商用の実取引は未実施                                        |
| 接続診断・追加情報接続      | 同試験                                                        | 固有設定検証、未対応操作拒否、秘密情報不足／403／429、診断による公開版非変更、ODPT駅・時刻表、Eventbrite公開範囲、Ticketmaster中止、TomTom公式URL                                               | 公式仕様HTTP fixture                                                                |
| Google Calendar・提供元署名 | 同試験                                                        | OAuth owner・PKCE・state一回使用、暗号化token、etag更新、SquareのURL付き署名とUber署名、RT trip ID不一致                                                                                        | HTTP fixture。実Google OAuth認可・実Webhook配送は未検証                             |
| 導入CLI                     | `platform init`・`platform validate`                          | 四構成の初期設定生成、OIDC識別とorigin設定、v1入力からv2への移行。大規模GTFSの共通SQL生成                                                                                                       | ローカル生成・型検証。資源作成・remote配置コマンドは未実行                          |
| 四構成                      | 同試験、examples/platform JSON                                | 同じ管理APIで四設定を切替、公開feature反映、型検証                                                                                                                                              | 有資格サービスの実稼働を保証する試験ではない                                        |
| 公開フィード                | [実取得記録](public-feed-results.json)、`npm run feeds:smoke` | BART GTFS 102,426行、MBTA GTFS-RT 1,411エンティティ、Citi Bike GBFS 5,042行を取得・解析                                                                                                         | 実取得。GTFS-RTは対応static feedとの照合未検証                                      |
| 実WorkerのGBFS              | [Worker記録](worker-feed-results.json)                        | Wrangler WorkerがCiti Bikeへ接続し、D1へ5,042行を公開、公開APIで2,520ポートの状態を返した                                                                                                       | 実取得・実Worker・ローカルD1。車両確保／予約をしていない                            |
| ブラウザー                  | Playwright CLI、[予定画面](qa/saved-plan.png)                 | 公開検索、活動詳細、往路・帰路保存、既存予定への宿泊追加、未予約表示、オンラインでは移動案内無し、GBFS実データ表示と予定追加                                                                    | 活動は明示的な試験データ。経路応答はbrowser fixture、セッションはローカル試験用seed |
| ビルド                      | `npm run build`                                               | Hono型検査、Next本番ビルド                                                                                                                                                                      | 旧サービスの独立ビルドは対象外                                                      |
| Cloudflare bundle           | `opennextjs-cloudflare build`、`wrangler deploy --dry-run`    | Web Workerを生成、API Worker bundleを生成、D1/R2/RateLimit bindingsを確認                                                                                                                       | bundle検証、クラウド配置は未実施                                                    |
| lint                        | `npm run lint`                                                | エラー0、警告70                                                                                                                                                                                 | provider応答境界のany等。警告を隠す設定は追加していない                             |

実Workerの試験でCloudflareが`fetch(..., {redirect:'error'})`を受け付けないことを確認し、`manual`＋HTTP状態確認へ修正しました。再取得は成功し、第三者URLへの資格情報付き自動redirectを行いません。

## 引渡し時に残る接続検証

追加のブラウザー確認では、実ローカルAPIを使ってSquare接続の追加・設定保存と`credential-required`診断を確認しました。[設定画面](qa/connection-settings.png)を保存しています。[予約画面](qa/service-reservation.png)ではHTTP応答を画面試験用fixtureへ置換し、見積表示、連絡先入力、条件確認、冪等キー付き要求、pending結果表示を確認しました。商用の予約成立を確認したものではありません。

GTFS CLIは6レコードの試験ZIPで検証・SQL生成し、実WranglerのローカルD1へ投入して公開版の`status: ok`とレコード数6を確認しました。remote R2/D1へ投入する配置CLIは未実行です。設定変更試験では、未確定・確定予約が残る接続の削除・接続先変更を409で拒否し、許可した設定変更で旧接続診断を無効化することを確認しました。

- Luma、connpass、楽天、ODPT、駅すぱあとの実キーによる権限・取得・レート・表示条件の確認。
- 導入先のOTPに実GTFS／GTFS-RTを入れた往復探索、導入先IdPでのログイン。
- 導入先Stripeテスト環境の実購入・Webhook・オンライン認証・返金、Cloudflare本番配置のCPU／容量・cron試験。
- Square、Uber、Viator、Booking.com、Expediaの固有取引コードは実装済み。実アカウントの対象商品・権限・sandbox取引・取消は未検証。カード取扱資格・3DS追加認証など、この実装の対象外条件は[導入手順](deployment.md)に記載。
- ODPTのStation・StationTimetable・TrainTimetable・TrainInformationを実装しfixture検証。実キーによる時刻表取得は未検証。
- Google Calendar書込みは実装済み。実利用者OAuth・所有カレンダーへの書込みは未検証。自動更新・逆同期は未実装。
- Masabiは正式仕様・接続環境の取得待ちで未実装。TicketmasterのPartner販売、カメラ読取、複数事業者の共同予約・一括取消は提供していない。外部リンク案内を成立予約に昇格させない。

未確認の実取引を「成功」と報告しないため、実接続・fixture・外部遷移の範囲を上表で分離しています。取引試験は導入先のsandbox・販売資格・取消条件を得てから、提供元ごとに行います。

## Ponytail review

1. `apps/web/package.json`: delete: 未使用のmaplibre-gl追加を削除。置換なし。
2. 旧URL転送middleware: delete: 各旧pageのserver redirectと重複する転送を削除。各pageへ集約。
3. `apps/web/src/components/platform/shared-plan.tsx`: reuse: 保存後のローカル予定データ再構築を削除。`/plans`の再読込を使用。
4. `apps/web/src/app`の旧管理・予約・購入画面: delete: ダミー状態を持つ旧画面を新画面への転送へ置換。旧NestJS実装は資料として保持。

共通取引契約は計画で明示された追加接続の試験用であり、サービスを稼働させる架空の予約backendを作っていません。新構成は単一API・D1状態・接続関数に留めています。

追加実装のPonytail review：共通設定定義からフォームを生成し、予約復旧は既存Scheduled WorkerとD1ジョブへ集約。暗号化は`tokens.ts`、GTFS SQL生成は`gtfs-sql.ts`を再使用します。固有認証は`providers.ts`へ置き、診断と取引の相互importを除きました。

Lean already. Ship.
