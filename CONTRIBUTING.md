# OpenMaaSへの貢献ガイド

OpenMaaSプロジェクトへの貢献をありがとうございます！このガイドでは、プロジェクトへの貢献方法について説明します。

## 行動規範

このプロジェクトに参加するすべての人は、[行動規範](CODE_OF_CONDUCT.md)を遵守することが求められます。

## 貢献の方法

### バグ報告

バグを見つけた場合は、以下の手順で報告してください：

1. 既存の[Issues](https://github.com/openmaas/openmaas/issues)を確認し、同じバグが報告されていないか確認
2. 新しいIssueを作成し、以下の情報を含める：
   - バグの詳細な説明
   - 再現手順
   - 期待される動作
   - 実際の動作
   - 環境情報（OS、ブラウザ、Node.jsバージョンなど）

### 機能提案

新機能の提案は大歓迎です：

1. [Discussions](https://github.com/openmaas/openmaas/discussions)で提案を共有
2. フィードバックを収集し、提案を洗練
3. 合意が得られたら、Issueを作成

### プルリクエスト

#### 開発環境のセットアップ

```bash
# フォーク & クローン
git clone https://github.com/YOUR_USERNAME/openmaas.git
cd openmaas

# 上流リポジトリを追加
git remote add upstream https://github.com/openmaas/openmaas.git

# 開発ブランチを作成
git checkout -b feature/your-feature-name
```

#### コーディング規約

- **TypeScript/JavaScript**: ESLint設定に従う
- **Python**: PEP 8に準拠
- **コミットメッセージ**: [Conventional Commits](https://www.conventionalcommits.org/)形式

```
feat: ユーザー認証機能を追加
fix: 経路検索のバグを修正
docs: READMEを更新
chore: 依存関係を更新
```

#### テスト

すべての新機能とバグ修正にはテストを含めてください：

```bash
# ユニットテストの実行
npm test

# E2Eテストの実行
npm run test:e2e

# カバレッジレポート
npm run test:coverage
```

#### プルリクエストのプロセス

1. フィーチャーブランチで開発
2. テストを追加/更新
3. ドキュメントを更新
4. コミットをスクワッシュ（必要に応じて）
5. プルリクエストを作成

プルリクエストテンプレート：

```markdown
## 概要

変更の概要を記述

## 変更内容

- [ ] 機能A を実装
- [ ] バグB を修正

## テスト

- [ ] ユニットテスト追加
- [ ] E2Eテスト追加

## チェックリスト

- [ ] コードはlintを通過
- [ ] すべてのテストが成功
- [ ] ドキュメントを更新
```

### ドキュメント

ドキュメントの改善も重要な貢献です：

- APIドキュメントの更新
- チュートリアルの作成
- 翻訳の追加

### コミュニティ

- [Discord](https://discord.gg/openmaas)に参加
- 週次オンラインミーティングに参加（毎週水曜日 20:00 JST）
- ブログ記事やチュートリアルを作成

## 開発ワークフロー

### ブランチ戦略

- `main`: 安定版リリース
- `develop`: 開発版
- `feature/*`: 新機能
- `fix/*`: バグ修正
- `docs/*`: ドキュメント更新

### リリースプロセス

1. `develop`から`release/vX.Y.Z`ブランチを作成
2. リリースノートを作成
3. `main`にマージ
4. タグを作成
5. `main`を`develop`にマージ

## 連絡先

質問がある場合は：

- Discord: [OpenMaaS Community](https://discord.gg/openmaas)
- Email: contributors@openmaas.org
- GitHub Discussions: [ディスカッション](https://github.com/openmaas/openmaas/discussions)

## ライセンス

貢献されたコードは、プロジェクトと同じMITライセンスの下で公開されます。
