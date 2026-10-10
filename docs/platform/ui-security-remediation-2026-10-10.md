# OpenMaaS UI修正・セキュリティ監査結果

実施日：2026-10-10。対象：現行Web、Hono API、共通表示処理、配置CLI・CI。修正前の全22ルート監査は [UI監査](ui-audit-2026-10-10.md) を参照。

## 結論

利用者画面に残っていたデータ確認用の表示を、地点の選択、移動手順、予約条件、保存した予定の確認へ置き換えた。管理画面は取引一覧を表にし、生データは必要な場合だけ開く詳細へ移した。商用取引や実配備の成功を確認したという意味ではない。

指定された [Cloudflare security-audit-skill](https://github.com/cloudflare/security-audit-skill) に沿い、認証・所有者境界、外部通信、ブラウザー、配備・供給網を分けてソース監査と独立レビューを行った。確認できた防御上の不足を修正した。確定脆弱性は0件、配備条件に依存する要検証候補は1件。動的監査はスキルが求める完全なOS隔離を確立していないため未完了と記録した。[適用したSKILL.md](https://github.com/cloudflare/security-audit-skill/blob/main/skills/security-audit/SKILL.md) の「If every control cannot be enforced, do not execute target code」に従い、隔離条件を満たせない実行は監査工程で行っていない。通常の開発試験を、隔離された攻撃再現の証拠として扱っていない。

## UI監査12項目への対応

| 元の指摘                   | 実装した変更                                                                                       | 確認                                                                      |
| -------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1. 料金・取消条件のJSON    | 共通変換で説明、期限、金額、返金条件を抽出。既存JSON文字列にも対応。不明条件を無料取消と推測しない | 変換試験、予約条件のブラウザー表示                                        |
| 2. 地域と無関係な交通      | 駅・登録施設を選択し周辺5kmの停留所・ポート・車両を表示。全フィード件数の表示を廃止                | 東京の地点でNYのCiti Bikeを出さないことを実画面確認                       |
| 3. 古い在庫・内部診断      | 古い在庫は現在の空き不明と表示。更新時刻、路線名、行先、周辺停留所の運行通知へ変換                 | 鮮度処理・API変換の照合、実画面確認。運行通知の実事業者データ再現は未実施 |
| 4. 経路の情報不足          | OTP区間時刻を取得。交通手段、乗降地点、時刻、所要時間を共通表示                                    | 保存経路の区間・時刻を実画面確認。外部経路エンジンの実検索は未実施        |
| 5. 座標の手入力            | 登録駅・施設・住所検索へ変更。編集時に旧座標を消し、未選択なら検索を停止                           | API地点検索試験、詳細画面確認、配車の空座標拒否をソース照合               |
| 6. 内部予約状態            | 状態を日本語表示。未知状態は確認が必要と表示                                                       | 変換試験、確定予約の実画面確認                                            |
| 7. 保存経路の欠落          | 往路・帰路の保存済み区間を開いて確認                                                               | ローカル試験予定で実画面確認                                              |
| 8. 一律の参照券文言        | 商品ごとのreference設定へ変更。券・注文も同じ設定を参照                                            | 商品ありの実画面、既存取引試験                                            |
| 9. 管理画面のJSON一覧      | 注文・予約・復旧ジョブ・操作・監査を表にし、生データは折り畳み                                     | ローカル管理者で予約一覧を実画面確認                                      |
| 10. 乗車確認のトークン画面 | スタッフ認証、QRカメラ読取り、手入力併用、認証後の券名・期限                                       | スタッフ画面確認、原子的券消費試験。実機カメラ読取りは未実施              |
| 11. 読込みと空一覧の混在   | 読込み・取得失敗・0件を区別。再読込成功で古いエラーを解除                                          | 全7画面の表示・分岐照合                                                   |
| 12. 情報源ID・生エラー     | 公開ラベル、読みやすいAPIエラー、安全な外部URLへ変更                                               | URL変換試験、活動詳細実画面確認                                           |

地点検索は導入先が取り込んだ駅・施設・住所が対象。世界全体の住所検索を提供するものではない。QRカメラは対応ブラウザーのBarcodeDetectorを利用し、非対応時は手入力を提供する。

## セキュリティ修正

- 外部JSON応答をデコード後16MiB、GTFS/GTFS-RTを50MiBに制限し、上限超過時に読込みを停止。認証、決済、宿泊照会も共通処理を使用。
- Luma・Square・Google Calendarのページ取得に50ページ上限と反復cursor拒否を追加。
- 公開ログイン・活動詳細へのレート制限を追加。期限切れ認証state・sessionの定期削除を追加。
- CSV出力の式として解釈される値をエスケープ。Web/APIにnosniff等のレスポンスヘッダーを追加。
- 古いService Workerを退役し、OpenMaaSの旧キャッシュだけを削除して登録解除。他アプリのキャッシュは削除しない。

認証、所有者分離、OIDC/Google state・PKCE、JWT、Webhook署名、決済金額照合、一回券の原子的消費をソースと既存試験で照合した。新しい共通認証基盤や取引抽象層は追加していない。

## 検証記録

- `npm test`：62件成功。Miniflare/D1とHTTP fixture。条件変換、地点検索、応答サイズ上限、反復cursor、旧worker退役の回帰試験を追加。
- `npm run build`：API型検査とNext.js本番ビルド成功。
- `npm run lint`：エラー0・警告89。警告は既存のprovider境界のany等を含む。
- `wrangler deploy --dry-run`：API Worker bundle生成。クラウドへの配置は行っていない。
- Chromeで7実画面を確認。ローカルに限定した架空の管理者session・予定・予約・参照券を使用。提供元へ予約・取消・決済要求を送っていない。試験終了時に追加データと設定を復元。
- 監査JSON検証：findings 1件、coverage 10領域とも公式validator成功。

## 監査成果物と残る検証

[監査レポート](security-audit-2026-10-10/REPORT.md)、[確認範囲](security-audit-2026-10-10/coverage-ledger.json)、[候補と証拠](security-audit-2026-10-10/findings.json)、[実行状態](security-audit-2026-10-10/run-metadata.json)、[残る検証](security-audit-2026-10-10/NEEDS-VALIDATION.md)を公開する。監査作業の出力はリポジトリ外で作成し、独立レビュー後に公開用コピーを追加した。

要検証候補は、以前のworkerが登録され、同一originのprivate GETの200/basic応答がキャッシュされ、アカウント変更後もURL・Vary条件が一致した場合の応答再利用。現在のrootはそのworkerを登録せず、配置CLIはWeb/APIの別hostnameを要求する。実配備で候補が成立した証拠はなくseverityを付けていない。更新後の登録解除についても配備済みブラウザーでは未確認。

本番Cloudflareのbindings・ingress・権限、導入先IdP、商用サービスの実取引、隔離環境での攻撃再現、依存バージョンの外部アドバイザリ照合は未検証。`run_status: incomplete`はこの境界を残すための記録であり、安全性を保証する報告ではない。

## Ponytail review

What this change does: It turns raw provider data into usable travel, reservation and operations screens. It bounds external responses and polling, and retires the old cache worker.

The review found an empty-coordinate conversion in the ride search. It is fixed: editing a selected place clears coordinates, and search rejects missing coordinates before sending a request. No additional must-fix remained in the reviewed source.

Verdict: Ship the source changes.

Not checked: Live provider transactions, deployed infrastructure, device camera scanning, and dynamic security reproduction under the required OS isolation.
