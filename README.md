# OpenMaaS

移動と、その目的になるイベント・体験・施設・宿泊を組み合わせるオープンソースソフトウェア。
導入先が接続と地域を設定し、活動の検索、到着・帰路の案内、予定保存、外部申込み、導入先商品の決済を同じコードから構成できます。

OpenMaaSはソフトウェアです。地域やサービスごとの運営・販売・連携契約を代行する主体ではありません。

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

## ドキュメント

- [導入・構成・拡張手順](docs/platform/README.md)
- [配置CLI・資格情報・接続設定](docs/platform/deployment.md)
- [公式API接続台帳](docs/platform/connectors.md)
- [検証結果と未確認範囲](docs/platform/verification.md)
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

既存のNestJS・Docker実装と旧ドキュメントは参考資料として残しています。現在の標準構成と検証状況は`docs/platform`を正とします。

## 検証状況

自動試験56件成功、API型検査・Next.js本番ビルド・Cloudflare Worker bundle検証成功。lintはエラー0・警告70です。公開交通フィードの実取得とローカルD1取込、ブラウザー操作も確認しています。商用接続の試験はHTTP fixtureを使っており、商用アカウントでの実取引と本番配置は未検証です。Masabiの固有接続、追加3DS認証フローは未実装です。詳細は[検証結果](docs/platform/verification.md)を参照してください。

## ライセンスとコードの公開方針

現在のOpenMaaSは[GNU Affero General Public License v3.0 or later](LICENSE)（SPDX: `AGPL-3.0-or-later`）で提供します。改変した対象プログラムの配布にはAGPLの条件が適用され、改変版をネットワーク経由で提供する場合は、その利用者へ対応するソースコードを無償で入手する手段を提示する必要があります。商用利用・有料サービスの提供は可能です。

ソースコードは[GitHub](https://github.com/maas-creative/OpenMaaS)で公開しています。導入先が改変して提供する場合は、画面のソースコードリンクを実際に稼働している版のソースへ向けてください。ビルド時の`NEXT_PUBLIC_OPENMAAS_SOURCE_URL`で指定できます。APIキー・利用者情報の公開を求めるものではありません。

2026年10月8日にAGPLへ移行しました。それ以前にMITで公開した版の許諾は取り消しません。既存MIT部分の著作権・許諾・免責は[LICENSES/MIT.txt](LICENSES/MIT.txt)と[NOTICE](NOTICE)に保持します。依存ライブラリ・取得データ・外部APIにはそれぞれの利用条件が適用されます。利用・導入の相談は[MaaS Creative](https://maas-creative.com)へお問い合わせください。
