# OpenMaaS

<p><img src="assets/images/openmaas-logo.jpg" alt="OpenMaaS" width="480"></p>

移動と、その目的になるイベント・体験・施設・宿泊を組み合わせるオープンソースソフトウェア。
導入先が接続と地域を設定し、活動の検索、到着・帰路の案内、予定保存、外部申込み、導入先商品の決済を同じコードから構成できます。

[OpenMaaSの解説サイト](https://maas-creative.com/openmaas) · [導入手順](docs/platform/deployment.md) · [本番稼働までのサポート相談](https://maas-creative.com/company#contact)

OpenMaaSはソフトウェアです。地域やサービスごとの運営・販売・連携契約を代行する主体ではありません。

## OpenMaaSが目指すこと

MaaS（Mobility as a Service）は、複数の移動手段を利用者の目的に合わせて組み合わせ、検索・予約・利用までをつなぐ考え方です。OpenMaaSは交通に加え、その目的になるイベント・体験・施設・宿泊を結び付けます。

地域ごとに同じ画面や接続処理を作り直す負担を減らし、交通事業者や活動の提供者との連携、利用者の困りごとの理解、サービスを続ける仕組みに労力を注げるようにします。接続先と地域を導入先が設定し、共通のコードから自分たちのMaaSを構成するためのOSSです。

利用者の体験は、次の流れを中心にしています。

1. 行きたい場所や参加したい活動を日時・場所・カテゴリから探す。
2. 開始時刻に間に合う往路と、終了後の帰路を調べる。
3. 接続先が提供する申込みページや、対応するAPI予約を利用する。
4. 活動・交通・宿泊・券を同じ予定に関連付けて確認する。
5. 時刻変更・中止を確認し、必要な移動を再検索する。

保存した予定、外部申込み先へ案内したもの、APIで確認できた予約を区別します。受付時間がない活動では初期15分の余裕時間を変更でき、終了時刻が不明なら帰路日時を入力します。オンラインイベントに移動案内を付けず、会場座標がない場合は推測した位置へ案内しません。

## 四つの導入設定例

| 構成                   | 使い方                                                   | 設定例                                                |
| ---------------------- | -------------------------------------------------------- | ----------------------------------------------------- |
| イベントからの交通案内 | Luma・connpassの活動から到着・帰路検索と参加先の案内へ   | [event-transit](examples/platform/event-transit.json) |
| 観光周遊               | 活動、宿泊、公共交通、シェア交通を予定へ組み合わせる     | [tourism](examples/platform/tourism.json)             |
| 生活交通案内           | 時刻表・停留所・運行情報・シェア交通の空き状況を表示する | [local-transit](examples/platform/local-transit.json) |
| 券販売                 | 導入先商品の決済・発券・オンライン認証・返金を扱う       | [ticket-sales](examples/platform/ticket-sales.json)   |

## 提供する機能

| 機能                   | 内容                                                                          |
| ---------------------- | ----------------------------------------------------------------------------- |
| 目的から探す           | イベント・体験・施設・宿泊を検索し、情報源・場所・日時・申込み先を表示        |
| 目的に合わせて移動する | 開始前の到着検索と終了後の帰路検索。GTFS・GTFS-RT・ODPT・GBFSの情報表示       |
| 予定を組み合わせる     | 活動・往路・帰路・宿泊・券を関連付けて保存。未予約と確定予約を区別            |
| 申し込む・購入する     | 外部申込み案内、対応サービスのAPI予約、導入先商品のStripe Checkout            |
| 変更と障害に対応する   | 開催変更・中止、予約再照会、重複要求防止、取消・返金の復旧                    |
| 導入先が構成する       | 接続・地域・取得条件・経路検索・OIDC・対応操作を設定。資格情報はSecretsで管理 |
| 予定を持ち出す         | ICS出力と、利用者認可によるGoogle Calendarへの登録・更新                      |

情報接続はLuma、connpass、楽天トラベル、Eventbrite、Ticketmaster、TomTom等に対応します。API予約はSquare、Uber Guest Rides、Viator、Booking.com Demand、Expedia Rapidの対応範囲を実装しています。各提供元の資格・契約・地域・支払方式による条件は接続台帳に記載しています。複数サービスを予定に追加しても共同予約・一括取消として扱いません。

## 接続ごとの対応範囲

次は接続コードの実装範囲です。実アカウントでの検証済みサービス一覧ではありません。認証、契約、対象地域、更新・保存条件は[公式API接続台帳](docs/platform/connectors.md)を参照してください。

| 接続                                      | 操作と条件                                                                                            |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| GTFS・GTFS-RT・GBFS・ODPT                 | 時刻表・停留所・運行情報・空き状況の取得。大規模GTFSはCLI取込に対応                                   |
| OpenTripPlanner・駅すぱあと               | 日時指定の経路検索。導入先が検索サービスを設定                                                        |
| Luma・connpass・Eventbrite・Ticketmaster  | 権限内のイベント取得と外部参加・購入案内。Luma参加者名簿は取り込まない。TicketmasterはDiscoveryの範囲 |
| 楽天トラベル                              | 施設・空室検索と提供元予約先への案内                                                                  |
| Viator・Square Bookings・Uber Guest Rides | 提供元の手順に沿った予約・照会・取消。利用資格と対象地域の確認が必要                                  |
| Booking.com Demand・Expedia Rapid         | 宿泊検索・予約前確認・予約・照会・取消。契約・対応支払方式に依存。追加3DS認証は未実装                 |
| TomTom Parking Availability               | 駐車場の空き状況。駐車予約として扱わない                                                              |
| iCalendar・Google Calendar                | ICS出力、利用者認可によるカレンダー登録・更新                                                         |
| Stripe Checkout                           | 導入先商品の決済・照会・返金。提供元が決済するサービスを重ねて請求しない                              |

接続の対応能力に応じて画面と操作を構成し、未実装の操作を設定だけで有効化できないようにしています。交通事業者の販売契約を伴う実発券を、参照用一回券の試験と同一視しません。Masabiの固有接続は未実装です。

予約・購入では永続化した重複要求防止と再照会を使用します。応答が不明な取引は自動で新規作成を繰り返さず、照会・管理者確認で復旧します。取消対象と条件は予約ごとに扱います。

## ドキュメント

- [導入・構成・拡張手順](docs/platform/README.md)
- [配置CLI・資格情報・接続設定](docs/platform/deployment.md)
- [公式API接続台帳](docs/platform/connectors.md)
- [検証結果と未確認範囲](docs/platform/verification.md)
- [全ページUI修正・セキュリティ監査結果](docs/platform/ui-security-remediation-2026-10-10.md)
- [四つの導入設定例](examples/platform)

## ローカル起動

```sh
npm ci
npm run db:local --workspace=@openmaas/platform
npm run dev
# 別ターミナル
npm run dev:web
```

Node.js 22.16以上。Next.js / OpenNext、TypeScript / Hono、Cloudflare Workers / D1 / R2。
詳細な初回設定、OIDC、APIキー、公開デプロイ手順は導入手順を参照してください。商用APIの実取引には導入先の接続資格が必要です。

公開情報の検索・閲覧はログイン不要です。予定保存・購入には導入先のOIDC認証を使用します。資格情報のない接続は、取得や取引を実行する前に設定が必要です。

## 導入と本番稼働

```sh
npm run platform -- init event-transit
npm run platform -- validate
# Cloudflareのアカウントと権限を環境変数で設定してから実行
npm run platform -- deploy
# APIキーなどはコマンド引数や設定JSONに書かず、対話入力で登録
npm run platform -- secrets LUMA_KEY
npm run platform -- doctor
```

生成する導入設定はGit管理から除外します。APIキーはSecretsで管理し、設定には参照名だけを保存します。管理画面では接続ごとの対象地域・カレンダー・取得期間・更新間隔・対応操作を設定し、接続診断、最終取得、未確定取引、再照会結果を確認できます。詳しい初期設定・配置・認証・利用条件は[配置手順](docs/platform/deployment.md)にまとめています。

**本番稼働までをサポートするプランについては、[MaaS Creativeの問い合わせフォーム](https://maas-creative.com/company#contact)からご相談ください。**

## 開発・拡張

- `apps/web`：Next.jsの利用者向け画面と管理画面。
- `services/platform`：Hono API、共通モデル、接続・取引、D1/R2、定期更新。
- `scripts/platform`：設定検証、配置CLI、公開フィード確認。
- `examples/platform`：導入設定例。
- `docs/platform`：現行構成、API、接続条件、検証記録。

```sh
npm test
npm run build
npm run lint
```

接続を追加する場合は、対応操作と設定スキーマを登録し、提供元の仕様に沿う処理、台帳、契約テストを合わせて更新してください。認証情報・利用者情報をfixtureやログへ含めないでください。具体的な追加箇所は[拡張手順](docs/platform/deployment.md#接続を追加する)を参照してください。Issue・Pull Requestは、対象サービス、再現手順、期待する利用体験、検証結果を添えてください。

既存のNestJS・Docker実装と旧ドキュメントは参考資料として残しています。現在の標準構成と検証状況は`docs/platform`を正とします。

## 検証状況

2026-10-10の自動試験62件成功、API型検査・Next.js本番ビルド・Cloudflare Worker bundle検証成功。lintはエラー0です。公開交通フィードの実取得とローカルD1取込、ブラウザー操作も確認しています。商用接続の試験はHTTP fixtureを使っており、商用アカウントでの実取引と本番配置は未検証です。Masabiの固有接続、追加3DS認証フローは未実装です。詳細は[検証結果](docs/platform/verification.md)を参照してください。

## ライセンスとコードの公開方針

現在のOpenMaaSは[GNU Affero General Public License v3.0 or later](LICENSE)（SPDX: `AGPL-3.0-or-later`）で提供します。改変した対象プログラムの配布にはAGPLの条件が適用され、改変版をネットワーク経由で提供する場合は、その利用者へ対応するソースコードを無償で入手する手段を提示する必要があります。商用利用・有料サービスの提供は可能です。

ソースコードは[GitHub](https://github.com/maas-creative/OpenMaaS)で公開しています。導入先が改変して提供する場合は、画面のソースコードリンクを実際に稼働している版のソースへ向けてください。ビルド時の`NEXT_PUBLIC_OPENMAAS_SOURCE_URL`で指定できます。APIキー・利用者情報の公開を求めるものではありません。

著作権・免責事項は[NOTICE](NOTICE)を参照してください。依存ライブラリ・取得データ・外部APIにはそれぞれの利用条件が適用されます。本番稼働までの支援は[MaaS Creativeの問い合わせフォーム](https://maas-creative.com/company#contact)へご相談ください。
