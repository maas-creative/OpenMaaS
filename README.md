[日本語](#japanese) | [English](#english)

# OpenMaaS - Open Source Mobility as a Service Platform

---

<a name="english"></a>
## English

### Overview

OpenMaaS is an open-source Mobility as a Service (MaaS) platform that integrates various transportation services including public transit, ride-sharing, and bike-sharing into a unified platform. Our mission is to make urban mobility more accessible, efficient, and sustainable through open-source collaboration.

**Developed by [MaaS Creative Co. Ltd](https://maas-creative.com)**

### 🚀 Features

- **Multi-modal Transportation Integration**: Seamlessly combine public transit, ride-sharing, bike-sharing, and walking routes
- **Interactive Maps**: Real-time transit status maps with route visualization and station information
- **Secure QR Code Ticketing**: Dynamic QR codes with 30-second refresh, screenshot detection, and watermarks
- **Role-Based Dashboards**: Specialized interfaces for transport operators, ticket providers, and system administrators
- **Real-time Transit Data**: GTFS and GTFS-RT support for accurate, up-to-date transit information
- **Smart Route Planning**: Multi-modal journey planning with visual route display
- **Secure Payment Processing**: Integrated payment system with Stripe support and refund management
- **User Management**: Comprehensive user profiles, preferences, and trip history
- **Booking System**: Unified booking interface for various transportation providers
- **Progressive Web App**: Mobile-optimized experience with offline support
- **Developer-Friendly API**: RESTful APIs with comprehensive documentation
- **Microservices Architecture**: Scalable, containerized services with Kubernetes support

### 🏗️ Architecture

OpenMaaS follows a microservices architecture with the following components:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Frontend  │    │  Mobile Apps    │    │  Third-party    │
│                 │    │                 │    │  Integrations   │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼──────────────┐
                    │       Kong API Gateway     │
                    │   (Authentication, Routing) │
                    └─────────────┬──────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                       │                        │
┌───────▼────────┐    ┌─────────▼────────┐    ┌─────────▼────────┐
│  Auth Service  │    │  User Service    │    │ Transit Service  │
│ (Port 3001)    │    │  (Port 3002)     │    │  (Port 3003)     │
└────────────────┘    └──────────────────┘    └──────────────────┘
        │                       │                        │
┌───────▼────────┐    ┌─────────▼────────┐    ┌─────────▼────────┐
│ Route Service  │    │ Booking Service  │    │ Payment Service  │
│ (Port 3004)    │    │  (Port 3005)     │    │  (Port 3006)     │
└────────────────┘    └──────────────────┘    └──────────────────┘
        │                       │                        │
        └───────────────────────┼────────────────────────┘
                               │
                    ┌──────────▼───────────┐
                    │     PostgreSQL       │
                    │   (with PostGIS)     │
                    └──────────────────────┘
```

### Services

- **Auth Service**: JWT authentication, Keycloak integration, role-based access control
- **User Service**: User profiles, preferences, trip history management
- **Transit Service**: GTFS data processing, real-time transit information
- **Route Service**: Multi-modal route planning with OpenTripPlanner
- **Booking Service**: Reservation management and provider integration
- **Payment Service**: Stripe payment processing, refunds, payment methods

### 🛠️ Technology Stack

- **Frontend**: Next.js 15.3.3, React 19, TypeScript, Tailwind CSS 4
- **UI Components**: shadcn/ui, Radix UI primitives
- **Backend**: Node.js, NestJS, TypeScript
- **Database**: PostgreSQL with PostGIS for geospatial data
- **Authentication**: Keycloak, JWT, Role-based access control
- **API Gateway**: Kong with rate limiting and service discovery
- **Payment**: Stripe with webhook integration
- **Maps**: Interactive demo maps (Mapbox/Google Maps ready)
- **QR Security**: Dynamic generation with security features
- **Route Planning**: OpenTripPlanner integration
- **Containerization**: Docker, Docker Compose
- **Orchestration**: Kubernetes
- **Cache**: Redis
- **Documentation**: Swagger/OpenAPI

### 📋 Prerequisites

- Node.js 18+ and npm 9+
- Docker and Docker Compose
- Git

### 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/ukyonagata0105/OpenMaaS.git
   cd OpenMaaS
   ```

2. **Environment Setup**
   ```bash
   # Copy environment templates
   find . -name ".env.example" -exec cp {} {}.env \;
   
   # Edit environment variables as needed
   # Each service directory contains its own .env file
   ```

3. **Development Setup**
   ```bash
   # Run the automated setup script
   ./scripts/dev-setup.sh
   
   # Or manually start infrastructure
   npm run docker:up
   
   # Start all services in development mode
   npm run dev
   ```

4. **Verify Installation**
   - **Frontend Application**: http://localhost:3000
   - **API Gateway**: http://localhost:8000
   - **Keycloak Admin**: http://localhost:8080 (admin/admin)
   - **Individual service docs**: http://localhost:[port]/api
   
   **Demo Users** (available on frontend homepage):
   - General User: `user@example.com`
   - Transport Operator: `operator@jr.example.com`
   - Ticket Provider: `provider@jtb.example.com`
   - System Admin: `admin@openmaas.example.com`

### 📖 Documentation

- **API Documentation**: Available at each service endpoint `/api`
- **Architecture Guide**: See `/docs` directory
- **Development Guide**: See [CONTRIBUTING.md](CONTRIBUTING.md)

### 🤝 Contributing

We welcome contributions from developers worldwide! Please see our [Contributing Guide](CONTRIBUTING.md) for details on:

- Code of conduct
- Development workflow
- Pull request process
- Coding standards
- Testing requirements

### 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### 🛡️ Security

For security vulnerabilities, please see our [Security Policy](SECURITY.md).

### 🌍 Community & Support

- **Website**: [https://maas-creative.com](https://maas-creative.com)
- **Issues**: [GitHub Issues](https://github.com/ukyonagata0105/OpenMaaS/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ukyonagata0105/OpenMaaS/discussions)

### 📈 Roadmap

- [x] **Core MaaS Platform** - Multi-modal transportation integration
- [x] **Interactive Maps** - Real-time transit visualization 
- [x] **Secure QR Ticketing** - Dynamic QR codes with security features
- [x] **Role-Based Dashboards** - Operator and provider management interfaces
- [x] **Progressive Web App** - Mobile-optimized frontend
- [ ] **Production Map Integration** - Mapbox/Google Maps API integration
- [ ] **Multi-language Support** - Internationalization (i18n)
- [ ] **Machine Learning** - Route optimization and demand prediction
- [ ] **Mobile SDK** - Native mobile app development kit
- [ ] **Advanced Analytics** - Business intelligence dashboard
- [ ] **Carbon Footprint** - Environmental impact tracking
- [ ] **Third-party Integrations** - More transportation provider APIs

---

<a name="japanese"></a>
## 日本語

### 概要

OpenMaaSは、公共交通機関、ライドシェア、バイクシェアなどの様々な交通サービスを統一プラットフォームに統合するオープンソースのMobility as a Service（MaaS）プラットフォームです。オープンソースコラボレーションを通じて、都市のモビリティをより利用しやすく、効率的で持続可能なものにすることを使命としています。

**開発元: [MaaS Creative Co. Ltd](https://maas-creative.com)**

### 🚀 機能

- **マルチモーダル交通統合**: 公共交通機関、ライドシェア、バイクシェア、徒歩ルートをシームレスに組み合わせ
- **インタラクティブマップ**: リアルタイム交通状況マップとルート可視化、駅情報表示
- **セキュアQRコードチケット**: 30秒更新、スクリーンショット検知、ウォーターマーク付き動的QRコード
- **権限別ダッシュボード**: 交通事業者、チケット提供者、システム管理者向け専用インターフェース
- **リアルタイム交通データ**: GTFS および GTFS-RT サポートによる正確で最新の交通情報
- **スマートルート計画**: 視覚的ルート表示付きマルチモーダル移動計画
- **安全な決済処理**: Stripeサポートと返金管理を備えた統合決済システム
- **ユーザー管理**: 包括的なユーザープロファイル、設定、移動履歴
- **予約システム**: 様々な交通事業者向けの統一予約インターフェース
- **プログレッシブWebアプリ**: オフラインサポート付きモバイル最適化体験
- **開発者フレンドリーAPI**: 包括的なドキュメント付きRESTful API
- **マイクロサービスアーキテクチャ**: Kubernetesサポート付きスケーラブルなコンテナ化サービス

### 🛠️ 技術スタック

- **フロントエンド**: Next.js 15.3.3, React 19, TypeScript, Tailwind CSS 4
- **UIコンポーネント**: shadcn/ui, Radix UI プリミティブ
- **バックエンド**: Node.js, NestJS, TypeScript
- **データベース**: 地理空間データ用PostgreSQL with PostGIS
- **認証**: Keycloak, JWT, ロールベースアクセス制御
- **APIゲートウェイ**: レート制限とサービス発見機能付きKong
- **決済**: Webhookインテグレーション付きStripe
- **マップ**: インタラクティブデモマップ（Mapbox/Google Maps対応準備済み）
- **QRセキュリティ**: セキュリティ機能付き動的生成
- **ルート計画**: OpenTripPlanner統合
- **コンテナ化**: Docker, Docker Compose
- **オーケストレーション**: Kubernetes
- **キャッシュ**: Redis
- **ドキュメント**: Swagger/OpenAPI

### 📋 前提条件

- Node.js 18+ および npm 9+
- Docker および Docker Compose
- Git

### 🚀 クイックスタート

1. **リポジトリのクローン**
   ```bash
   git clone https://github.com/ukyonagata0105/OpenMaaS.git
   cd OpenMaaS
   ```

2. **環境設定**
   ```bash
   # 環境変数テンプレートをコピー
   find . -name ".env.example" -exec cp {} {}.env \;
   
   # 必要に応じて環境変数を編集
   # 各サービスディレクトリには独自の.envファイルがあります
   ```

3. **開発環境セットアップ**
   ```bash
   # 自動セットアップスクリプトを実行
   ./scripts/dev-setup.sh
   
   # または手動でインフラストラクチャを開始
   npm run docker:up
   
   # 開発モードですべてのサービスを開始
   npm run dev
   ```

4. **インストール確認**
   - APIゲートウェイ: http://localhost:8000
   - Keycloak管理画面: http://localhost:8080 (admin/admin)
   - 各サービスのドキュメント: http://localhost:[port]/api

### 🤝 貢献

世界中の開発者からの貢献を歓迎します！詳細については[貢献ガイド](CONTRIBUTING.md)をご覧ください：

- 行動規範
- 開発ワークフロー
- プルリクエストプロセス
- コーディング標準
- テスト要件

### 📄 ライセンス

このプロジェクトはMITライセンスの下でライセンスされています - 詳細は[LICENSE](LICENSE)ファイルをご覧ください。

### 🛡️ セキュリティ

セキュリティの脆弱性については、[セキュリティポリシー](SECURITY.md)をご覧ください。

### 🌍 コミュニティ & サポート

- **ウェブサイト**: [https://maas-creative.com](https://maas-creative.com)
- **課題**: [GitHub Issues](https://github.com/ukyonagata0105/OpenMaaS/issues)
- **ディスカッション**: [GitHub Discussions](https://github.com/ukyonagata0105/OpenMaaS/discussions)

### 📈 ロードマップ

- [ ] 多言語フロントエンドサポート
- [ ] 機械学習ベースのルート最適化
- [ ] より多くの交通事業者との統合
- [ ] モバイルSDK開発
- [ ] 高度な分析ダッシュボード
- [ ] カーボンフットプリント追跡

---

© 2024 MaaS Creative Co. Ltd. All rights reserved.