# Transit API 接続・経路案内の実装と検証

## 実装した利用体験

- イベントを選ばず、駅・施設・住所から出発地と目的地を選ぶ。現在地は利用者がボタンを押した場合に取得する。
- 出発・到着・指定日の最初の便・最終便を検索する。出発地と目的地の入替、乗換上限、所要時間・乗換・運賃・徒歩の優先条件を指定する。
- 候補を最大6件表示し、日時・所要時間・乗換・徒歩を比較する。不明な運賃を0円にしない。運賃が取得できる場合はきっぷ・ICの情報を表示する。
- 徒歩と交通機関の区間、行き先、提供される乗り場を表示。地図の背景・経路線・乗降場所を表示する。推定線、時刻表期限切れ、収録範囲の注意を示す。
- 乗る駅・停留所の発車予定を取得して確認する。時刻表による予定であり、実際の遅延を検出した表示ではない。
- ログインして選んだ経路を未予約の予定に保存。保存条件または現在時刻で再検索し、利用者が選んだ候補へ更新する。予約・購入・取消は行わない。
- 既存のイベント到着・帰路検索も同じ接続を使用。オンライン、会場座標欠損、終了時刻不明、中止の既存条件を維持する。

## 接続と設定

公式仕様: https://api.transit.ls8h.com/ 、https://api.transit.ls8h.com/api/openapi.json

`journey.provider: "transit-api"`を使用する。初期状態と四つの導入例で採用。保存済みの旧設定を勝手に変更しない。APIキー・URLの入力は不要で、設定画面でも不要な項目を隠す。OTP・駅すぱあとのイベント検索は維持している。

接続先はコードで固定する。共有のHTTPS・手動リダイレクト・応答サイズ制限を使用し、この接続は45秒で打ち切る。実検索で20秒を超える応答を確認したため、他接続の20秒制限とは分けた。検索・地点・駅の発車予定には既存のレート制限を適用する。上流の429も利用者へ待って再試行するよう知らせる。

入力した検索語、座標、日時、条件をTransit APIへ送る。地図を開いた場合はOpenStreetMapの背景タイルを取得する。地図の帰属表示と、交通データの提供元へのリンクを表示する。保存した経路は所有者だけが取得・変更できる。

## 実接続で見つけ、修正した点

- `numItineraries=6`でも追加の比較候補が返る。受信は32件までとし、正規化・優先条件による並替え後に6件へ絞る。
- 秒数はサービス日の0時を基準とし、負値や86400秒超を含む。結果のタイムゾーンでISO日時へ変換する。
- 駅までの徒歩は`accessWalkSecs`として別に返る。出発時刻と所要時間へ含め、駅からの徒歩も区間案内に加える。
- 始発・最終検索は選んだ日付の0:00／23:59を渡す。翌日到着も日付付きで表示する。最初の便はAPIの検索範囲で0時以降の最初の候補であり、鉄道事業者が呼ぶ早朝の始発だけを保証するものではない。
- ブラウザーで日時入力を変更した値が検索へ反映されることを確認。日時入力はinputイベントで同期する。
- 最初の地図実装では専用Workerの読込が失敗し、経路線が出なかった。Leafletへ変更し、実画面で背景・線・地点の描画を確認した。専用Workerや地図用のAPIキーは不要。
- 地図の名称・路線名は文字列として表示し、提供元の文字列をHTMLとして挿入しない。

## 試験結果

| 対象 | 方法と結果 | 範囲 |
| --- | --- | --- |
| 自動試験 | 76件成功 | 既存の接続・予約・取消・返金・OIDC・所有者分離と、新しい経路接続の契約試験。外部の商用応答はfixture |
| 型検査 | APIの`tsc --noEmit`、Web型検査成功 | 保存した検索条件・任意の地図情報などを含む |
| Web | Next.js本番ビルド成功 | 新しい画面と既存画面 |
| API Worker | Wrangler `deploy --dry-run`成功 | bundle検証。本番配置ではない |
| 地点候補 | 実APIで東京駅・新宿駅の候補を取得 | OpenMaaS API経由 |
| 出発・到着・最初・最終 | 4種ともHTTP 200、実経路取得 | [実接続記録](transit-api-qa)。公共の駅座標のみ |
| 発車予定 | 東京の山手線データを実取得 | 提供元の時刻表情報 |
| PC・スマホ | 候補比較、日付と日時指定、経路図と徒歩・乗降案内を確認 | 本番ビルドをローカル実行。390px表示も確認 |
| 保存・更新 | 未ログインの拒否、保存→予定一覧→再検索→候補変更→更新をブラウザーで確認 | 実経路・実隔離D1。認証だけは合成した試験用セッション。実IdPではない |
| 所有者と取引 | 他人の更新拒否、未予約状態、重複取引・応答不明・取消失敗などを自動試験 | 商用実アカウントの成立確認ではない |

画面証跡:

- [PCの実経路図](transit-api-qa/desktop-route.png)
- [スマホの経路比較](transit-api-qa/mobile-comparison.png)
- [スマホの経路図](transit-api-qa/mobile-route.png)
- [実APIの発車予定](transit-api-qa/station-departures.png)
- [候補を変更した保存済み経路](transit-api-qa/saved-route.png)

隔離した再現用サーバーは`npx tsx services/platform/scripts/transit-live-qa.ts`で起動する。認証画面操作を試す場合だけ`--auth-fixture`を付け、localhost:8789/qa/login-fixtureを開く。実際のOIDC接続ではない。公開Workerにはこの経路を登録しない。localhostだけに接続を受け付け、D1・R2は隔離している。

## この接続で埋まらない機能

経路検索・比較・地図・予定保存・手動再検索は実装した。移動中の遅延を検出して通知する機能、車いす・階段回避を保証する経路、交通事業者で使える実乗車券の発券は、この読取専用APIの接続で実装済みとは扱わない。追加の運行・通行条件データと、発券先の仕様・接続資格が必要になる。

商用の予約・決済は既存接続のfixture試験を含む。実商用アカウントでの取引、実IdP、本番環境の稼働は今回の検証に含めない。

## Ponytail review

What this change does: It connects a real public route API to the app. Users can compare routes, see a map and departure times, and save or replace an unreserved route.

Looks good. Ship.

Checked the caller and response formats, time conversion, walking legs, unknown fares, API failure handling, ownership checks, snapshots and real browser flow. The existing request helper, place picker, route view, plan storage and login checks are reused. There is no new database schema or transaction backend. Leaflet adds one runtime dependency; the larger map implementation was removed after a real rendering failure.

Not checked: production Cloudflare runtime, real IdP and commercial transactions. These are separate from the public Transit API calls tested here.
