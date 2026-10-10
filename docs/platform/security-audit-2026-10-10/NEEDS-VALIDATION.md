# 残る検証

1. 旧workerの登録・配備origin・更新後キャッシュ削除。
2. スキルの完全なOS隔離で行う動的境界検証（通常の開発試験とは別）。
3. 配備したCloudflare bindings/ingress/rate limiter/headers、R2/D1権限、IdP/provider資格。
4. 外部アドバイザリとの依存バージョン照合。

以上は「脆弱性がある」と断定する一覧ではない。要検証の候補はfindings.jsonに限定する。
