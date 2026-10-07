# 設定と資格情報で導入する

Node.js 22.16以上とCloudflare Workers・D1・R2を使います。Web/APIは同じ独自ドメイン内の別サブドメインへ配置します。導入先のアカウント、接続契約、販売資格を使用し、OpenMaaS用の共通商用アカウントは用意しません。

## 初期配置

```sh
npm ci
npm run platform -- init event-transit
```

`event-transit`、`tourism`、`local-transit`、`ticket-sales`を選べます。対話で導入名、Web/API origin、OIDC issuer・client ID、管理者subjectを入力します。`deployment/config.json`と`deployment/deployment.json`を生成し、Gitから除外します。初期配置前の接続を設定して検証します。商用接続は無効のまま配置し、配置後に管理画面で設定できます。

```sh
npm run platform -- validate
# CLOUDFLARE_ACCOUNT_ID と CLOUDFLARE_API_TOKEN を環境変数に設定
npm run platform -- deploy
```

CLIはD1/R2を作成または再使用し、マイグレーション、API配置、初期設定、OpenNextビルド、Web配置を行います。Cloudflareの資源作成・Workers配置・独自ドメイン設定に必要な権限を与えてください。独自ドメインのゾーンを当該アカウントで管理する必要があります。再実行時に既存の券署名鍵・OAuth暗号化鍵を変更しません。初回設定済みの409は既存設定を維持します。再配置は管理画面の設定をローカルJSONで上書きしません。

今回、実Cloudflareアカウントへの配置は実施していません。CLI初期設定・検証とWorker bundleをローカルで検証しています。

## 認証・秘密情報

OIDCのcallbackは`API_ORIGIN/api/v1/auth/callback`です。管理者は`issuer|subject`で識別します。導入設定画面からOIDC・経路検索・管理者・券認証担当者を変更できます。現在操作中の管理者を除く設定変更は拒否します。

```sh
npm run platform -- secrets LUMA_KEY
npm run platform -- secrets OIDC_CLIENT_SECRET
npm run platform -- doctor
```

秘密値はWranglerの対話入力で登録し、コマンド引数・設定JSONへ記載しません。設定には`secretRef`だけを指定します。`doctor`は公開Web/APIの到達と導入名を確認します。管理者ログイン後、`/connections`で接続ごとに診断してください。診断と取得・公開版更新は別操作です。診断成功は予約・販売契約の承認を意味しません。

## 接続ごとの設定

`/connections`の「接続を追加」でサービスを選ぶと、固有の設定項目・選択肢と対応操作が表示されます。対象地域、カテゴリ、取得条件、更新間隔、出典・利用条件を入力します。取引操作は導入先が契約・権限を確認したものだけ有効化します。

| 接続              | 必要な設定・秘密情報                                                                    | 利用範囲                                                                                           |
| ----------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Luma              | `secretRef`、scope、calendarIds、after/before                                           | キーの権限内の公開活動。参加申込みはLumaへ案内                                                     |
| connpass          | APIキー参照、keyword等                                                                  | 検索・外部参加案内                                                                                 |
| 楽天              | applicationId、accessKey参照、施設／地域条件                                            | 施設・空室検索、提供元予約先へ案内                                                                 |
| GTFS/GTFS-RT/GBFS | URL、RTにはstaticSourceId                                                               | 時刻表・運行情報・空き状況。RTのID不一致を表示                                                     |
| ODPT              | consumerKey参照、operator/railway、datasets                                             | Station、StationTimetable、TrainTimetable、TrainInformation。ODPT calendarを選択して発車時刻を表示 |
| Eventbrite        | token参照、organizationId                                                               | 組織の公開イベントと管理者の注文状態照会。参加者名簿なし                                           |
| Ticketmaster      | Discovery key参照、地域・期間                                                           | 検索・販売ページ案内。Partner販売は未実装                                                          |
| TomTom            | key参照、parkingIds又は緯度経度                                                         | 駐車場・空き情報。駐車予約はしない                                                                 |
| Square            | access token参照、locationId、environment、apiVersion                                   | サービス、空き、顧客作成、予約・照会・取消。予約を支払済みとは扱わない                             |
| Uber              | Bearer参照又はclientId/clientSecretRef、organizationId、environment、sandboxRunId       | 法人Guest Rides見積・配車・照会・取消。地域・承認条件による                                        |
| Viator            | key参照、productCodes、environment、paymentMode                                         | 外部案内又はiframeモードの予約・照会・voucher・取消。予約権限契約が必要                            |
| Booking.com       | Bearer参照、affiliateId、bookerCountry、accommodationIds、environment、paymentMode      | 検索・preview・予約・照会・取消。external/card/walletを区別                                        |
| Expedia           | API key参照、同参照名に`_SHARED`を付けた共有秘密、propertyIds、国・通貨・言語・販売条件 | shopping・pricecheck・card予約・照会・取消                                                         |
| Google Calendar   | clientId、client secret参照、`OAUTH_ENCRYPTION_KEY`                                     | 利用者が所有するカレンダーへ明示的な予定登録・更新                                                 |
| Masabi            | 正式仕様・接続環境を取得する必要あり                                                    | 未実装。設定で取引を有効化できない                                                                 |

Stripeは導入先商品のみに使用します。`STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`を登録し、`API_ORIGIN/api/v1/webhooks/stripe`へCheckout完了・非同期成功・失効イベントを設定します。

Square／Uber通知は`API_ORIGIN/api/v1/webhooks/providers/SOURCE_ID`です。署名鍵を接続の`secretRef`に`_WEBHOOK`を付けた名前で登録します。署名・重複を検証し、提供元APIへ再照会します。

Google OAuthのcallbackは`API_ORIGIN/api/v1/integrations/google/callback`です。scopeは`calendar.events.owned`と`calendar.calendarlist.readonly`です。利用者認可・所有カレンダー選択が必要です。登録済み予定を自動で追跡更新する機能や逆同期はありません。「更新」操作で現行情報を反映します。認可解除はGoogleの既存予定を削除しません。

## 取引の対応範囲と復旧

予約が未確定・有効な間は、接続IDの削除やアカウント・環境・対象加盟店の変更を拒否します。先に予約を照合・完了させてください。設定変更時は以前の接続診断を無効化するので、取引を再開する前に診断を実行します。秘密値の通常の更新は同じ参照名でCLIから行います。

商用APIは資格情報だけで利用資格・販売条件が成立するものではありません。対象商品、支払方式、権限がこの接続実装の範囲に入るか、導入先のsandboxで確認します。Viatorは公式iframeに支払情報を入力し、商品別質問・参加者別質問・単位を提供元仕様から表示します。条件付き質問、言語ガイド等が必要な商品は個別確認が必要です。

Booking.com／Expediaのcardモードはカード情報を要求処理中のみ提供元へ送信し、DB・ジョブ・ログへ保存しません。これらを使用する導入には提供元が要求するカード取扱資格・販売認証が必要です。追加3DS認証フロー、全決済モデルを網羅していません。Booking.com walletは契約上利用可能な場合だけ有効化します。検索・外部案内から始める導入も可能です。

応答不明で提供元IDがないSquare／Uberの予約は、自動で作り直しません。管理者が導入先参照番号・提供元画面と照合する必要があります。Booking.com／Expediaは参照番号による検索復旧を実装しています。Expedia照合用メールアドレスは暗号化して保存します。`OAUTH_ENCRYPTION_KEY`は暗号化済み認可・照合情報がある間維持してください。

取消は対象予約ごとに条件を確認して行います。Viatorの再試行時に取消見積が変わった場合は再確認が必要です。複数サービスを関連付けても共同予約・一括取消にはしません。返金の成立は提供元の状態に従います。

## 大規模GTFS

接続の`params.ingestion`を`cli`にしてcron取得を停止します。

```sh
npm run platform -- import-gtfs SOURCE_ID /path/feed.zip
```

CLIはZIPを検証し、原本をR2へ保存してD1へ新バージョンを投入します。全レコードの投入後に公開版を切り替えます。失敗した投入の旧公開版は維持します。D1容量と大量投入時間はデータ規模に合わせて見積もってください。ローカルSQLだけ必要な場合は従来の`npm run import:gtfs --workspace=@openmaas/platform -- ZIP SOURCE_ID SQL_OUTPUT`も使用できます。

## 接続を追加する

`services/platform/src/registry.ts`へ設定スキーマと対応能力を登録し、情報取得を`connectors.ts`／`providers.ts`、固有取引を`transactions.ts`／`merchant.ts`へ追加します。自由なendpointや処理DSLを管理画面へ持ち込まず、提供元の手順をコードで実装します。共通画面はActivity・Offer・Reservationと設定済み能力を使用します。台帳と公式仕様fixtureを更新し、未実装操作を有効にできないことを確認してください。
