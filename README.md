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

既存の[MIT License](LICENSE)を継承します。著作権・許諾・免責の表示を維持し、依存ライブラリ・取得データ・外部APIの利用条件もそれぞれ適用されます。

ソースコードは[GitHub](https://github.com/maas-creative/OpenMaaS)で公開しています。MITライセンスの条件に従って利用・改変・再配布できます。導入先の資格情報や個別設定は公開コードに含めず、各導入先で管理します。利用・導入の相談は[MaaS Creative](https://maas-creative.com)へお問い合わせください。
