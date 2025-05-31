# OpenMaaS - オープンソース Mobility as a Service プラットフォーム

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)](CONTRIBUTING.md)

OpenMaaSは、公共交通、ライドシェア、バイクシェアなどの様々な交通サービスを統合する、オープンソースのMobility as a Service (MaaS)プラットフォームです。

## 🚀 特徴

- **マルチモーダル経路探索**: 複数の交通手段を組み合わせた最適な経路を提案
- **リアルタイム情報**: GTFS-RTによる遅延・運行情報の配信
- **統合決済**: 複数の交通サービスをワンストップで決済
- **オープンスタンダード**: GTFS、NeTEx等の国際標準に準拠
- **マイクロサービスアーキテクチャ**: 拡張性と保守性を重視した設計
- **マルチプラットフォーム**: Web、iOS、Androidに対応

## 🏗️ アーキテクチャ

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Web App   │     │ Mobile App  │     │  Admin UI   │
│   (React)   │     │  (Flutter)  │     │   (React)   │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┴───────────────────┘
                           │
                    ┌──────▼──────┐
                    │ API Gateway │
                    │   (Kong)    │
                    └──────┬──────┘
                           │
       ┌───────────────────┼───────────────────┐
       │                   │                   │
┌──────▼──────┐     ┌──────▼──────┐     ┌──────▼──────┐
│    Auth     │     │    User     │     │   Route     │
│ (Keycloak)  │     │  Service    │     │  Planning   │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                    ┌──────▼──────┐
                    │ PostgreSQL  │
                    │  + PostGIS  │
                    └─────────────┘
```

## 🛠️ 技術スタック

### バックエンド
- **主要言語**: TypeScript (Node.js/NestJS)
- **補助言語**: Python (データ処理), Java (既存ツール連携)
- **データベース**: PostgreSQL + PostGIS, Redis
- **認証**: Keycloak
- **APIゲートウェイ**: Kong

### フロントエンド
- **Web**: React + TypeScript + Material-UI
- **Mobile**: Flutter + Dart

### インフラ
- **コンテナ**: Docker
- **オーケストレーション**: Kubernetes
- **CI/CD**: GitHub Actions

## 🚦 はじめに

### 前提条件

- Docker & Docker Compose
- Node.js 18+
- Git

### 開発環境のセットアップ

```bash
# リポジトリのクローン
git clone https://github.com/openmaas/openmaas.git
cd openmaas

# 開発環境の起動
docker-compose up -d

# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

詳細な開発ガイドは [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。

## 📚 ドキュメント

- [アーキテクチャ設計書](docs/architecture.md)
- [API仕様書](docs/api.md)
- [開発者ガイド](docs/developer-guide.md)
- [デプロイメントガイド](docs/deployment.md)

## 🤝 コントリビュート

OpenMaaSはオープンソースプロジェクトです。以下の方法で貢献できます：

- バグ報告や機能提案は[Issues](https://github.com/openmaas/openmaas/issues)へ
- コードの貢献は[プルリクエスト](https://github.com/openmaas/openmaas/pulls)で
- ドキュメントの改善
- 翻訳の追加

詳細は[CONTRIBUTING.md](CONTRIBUTING.md)をご覧ください。

## 📊 プロジェクトステータス

現在、プロジェクトは初期開発フェーズです。以下のロードマップに従って開発を進めています：

- [x] プロジェクト基盤の構築
- [ ] 認証・認可基盤の実装
- [ ] コアサービスの開発
- [ ] フロントエンドアプリケーションの開発
- [ ] 本番環境へのデプロイ

## 📝 ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細は[LICENSE](LICENSE)ファイルを参照してください。

## 🙏 謝辞

このプロジェクトは以下のオープンソースプロジェクトを参考にしています：

- [OpenTripPlanner](https://www.opentripplanner.org/)
- [Trufi Core](https://github.com/trufi-association/trufi-core)
- [Navitia](https://github.com/CanalTP/navitia)

## 📧 連絡先

- プロジェクトWebサイト: [https://openmaas.org](https://openmaas.org)
- Email: contact@openmaas.org
- Discord: [OpenMaaS Community](https://discord.gg/openmaas)