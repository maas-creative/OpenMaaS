# オープンソースMaaS実装計画

## 概要
本計画は、研究文書「オープンソースMaaS開発技術調査」に基づき、段階的かつ実践的なアプローチでMaaSプラットフォームを構築するためのロードマップです。

## フェーズ1: 基盤構築（1-2ヶ月）

### 1.1 プロジェクト基盤のセットアップ
**目的**: 開発環境とプロジェクト構造の確立

**タスク**:
- モノレポ構造の設定（Lerna/Nx/Turborepoを使用）
- Docker Composeによるローカル開発環境
- Kubernetes/Helmチャートの準備
- CI/CDパイプライン（GitHub Actions/GitLab CI）
- コーディング規約とlinter設定

**成果物**:
```
openmaas/
├── services/           # マイクロサービス
├── libs/              # 共有ライブラリ
├── apps/              # フロントエンドアプリ
├── infrastructure/    # K8s/Docker設定
├── docs/              # ドキュメント
└── scripts/           # ビルド/デプロイスクリプト
```

### 1.2 認証・認可基盤（Keycloak）
**目的**: セキュアなユーザー管理の基盤確立

**タスク**:
- KeycloakのDockerコンテナ設定
- レルム、クライアント、ロールの設定
- OAuth2/OpenID Connect設定
- マルチテナント対応（利用者、事業者、管理者）

### 1.3 APIゲートウェイ
**目的**: 統一されたAPIエントリーポイントの確立

**タスク**:
- Kong/Tykの選定と設定
- ルーティング設定
- レート制限とAPI Key管理
- 認証プラグインの統合

## フェーズ2: コア機能開発（2-3ヶ月）

### 2.1 ユーザー管理サービス
**技術スタック**: Node.js (NestJS) + TypeScript + PostgreSQL

**機能**:
- ユーザー登録/プロファイル管理
- 権限管理（RBAC）
- 利用履歴管理
- 設定管理

**API設計**:
```typescript
POST   /api/v1/users
GET    /api/v1/users/:id
PUT    /api/v1/users/:id
DELETE /api/v1/users/:id
GET    /api/v1/users/:id/trips
```

### 2.2 GTFS データ処理サービス
**技術スタック**: Python (FastAPI) + PostgreSQL/PostGIS

**機能**:
- GTFSフィード取り込み
- データ検証と正規化
- 定期的な更新処理
- 空間インデックスの構築

**データモデル**:
```sql
-- 停留所
CREATE TABLE stops (
  stop_id VARCHAR PRIMARY KEY,
  stop_name VARCHAR NOT NULL,
  stop_lat DECIMAL(10,6),
  stop_lon DECIMAL(10,6),
  location GEOGRAPHY(POINT, 4326)
);

-- 路線
CREATE TABLE routes (
  route_id VARCHAR PRIMARY KEY,
  agency_id VARCHAR,
  route_short_name VARCHAR,
  route_long_name VARCHAR,
  route_type INTEGER
);
```

### 2.3 経路探索エンジン統合
**目的**: OpenTripPlannerを中心とした経路探索機能

**タスク**:
- OTPサーバーのDocker化
- グラフビルダーの自動化
- 経路探索API実装
- 結果キャッシング（Redis）

**API設計**:
```
GET /api/v1/plan
  ?from=lat,lon
  &to=lat,lon
  &time=2024-01-01T10:00:00
  &mode=TRANSIT,WALK
```

## フェーズ3: ユーザー向け機能（2-3ヶ月）

### 3.1 リアルタイム情報サービス
**技術スタック**: Node.js + WebSocket + Redis Pub/Sub

**機能**:
- GTFS-RTフィード処理
- 車両位置追跡
- 遅延情報配信
- プッシュ通知

### 3.2 予約管理サービス
**技術スタック**: Java (Spring Boot) + PostgreSQL

**機能**:
- 座席/車両予約
- QRコード発行
- キャンセル処理
- 予約履歴管理

### 3.3 決済統合サービス
**技術スタック**: Node.js (NestJS) + 決済ゲートウェイSDK

**機能**:
- 複数決済手段対応（クレジットカード、電子マネー、QRコード決済）
- トランザクション管理
- 返金処理
- 決済履歴
- PCI DSS準拠

## フェーズ4: フロントエンド開発（3-4ヶ月）

### 4.1 Webアプリケーション
**技術スタック**: React + TypeScript + Material-UI

**主要画面**:
- ホーム/経路検索
- 検索結果/詳細
- 予約/決済
- アカウント管理
- 利用履歴

**状態管理**: Redux Toolkit + RTK Query

### 4.2 モバイルアプリ
**技術スタック**: Flutter + Dart

**機能**:
- クロスプラットフォーム対応（iOS/Android）
- オフライン対応
- 位置情報サービス
- プッシュ通知
- ディープリンク

**アーキテクチャ**: Clean Architecture + BLoC Pattern

## フェーズ5: 運用・拡張機能（1-2ヶ月）

### 5.1 通知サービス
- メール通知（SendGrid/Amazon SES）
- プッシュ通知（FCM/APNs）
- SMS通知
- アプリ内通知

### 5.2 分析・レポーティング
- 利用統計ダッシュボード
- 事業者向けレポート
- データエクスポート機能
- BI連携（Metabase/Superset）

### 5.3 管理者ダッシュボード
- システム監視
- ユーザー管理
- コンテンツ管理
- 設定管理

## 技術選定まとめ

### バックエンド
- **主要言語**: TypeScript (Node.js) - API開発の統一性
- **補助言語**: Python (データ処理)、Java (既存ツール連携)
- **フレームワーク**: NestJS (企業向け構造)、FastAPI (高速データAPI)

### データベース
- **メインDB**: PostgreSQL + PostGIS
- **キャッシュ**: Redis
- **検索**: Elasticsearch (将来的な全文検索用)

### インフラ
- **コンテナ**: Docker
- **オーケストレーション**: Kubernetes
- **API Gateway**: Kong
- **認証**: Keycloak

### フロントエンド
- **Web**: React + TypeScript
- **Mobile**: Flutter
- **UI Library**: Material-UI (Web)、Material Design (Mobile)

## 開発チーム構成案

### 最小構成（5-6名）
1. **バックエンドリード** - アーキテクチャ、API設計
2. **フロントエンドリード** - Web/モバイル開発
3. **データエンジニア** - GTFS処理、地理空間データ
4. **DevOpsエンジニア** - インフラ、CI/CD
5. **フルスタック開発者** - 機能実装支援

### 推奨構成（10-12名）
- バックエンド開発者 × 4
- フロントエンド開発者 × 3
- モバイル開発者 × 2
- DevOps × 2
- QAエンジニア × 1

## マイルストーン

| フェーズ | 期間 | 主要成果物 |
|---------|------|-----------|
| フェーズ1 | 1-2ヶ月 | 開発環境、認証基盤、APIゲートウェイ |
| フェーズ2 | 2-3ヶ月 | ユーザー管理、GTFS処理、経路探索 |
| フェーズ3 | 2-3ヶ月 | リアルタイム情報、予約、決済 |
| フェーズ4 | 3-4ヶ月 | Webアプリ、モバイルアプリ |
| フェーズ5 | 1-2ヶ月 | 運用ツール、分析機能 |

**総期間**: 9-14ヶ月（最小構成での見積もり）

## リスクと対策

### 技術的リスク
- **複雑性**: マイクロサービスの複雑性 → 段階的な導入
- **性能**: 大規模データ処理 → キャッシング戦略、最適化
- **統合**: 外部システム連携 → 抽象化レイヤー、モック開発

### 運用リスク
- **スケーラビリティ**: 需要増加 → 自動スケーリング設計
- **セキュリティ**: 個人情報保護 → セキュリティファースト設計
- **可用性**: システム停止 → 冗長化、障害復旧計画

## 次のステップ

1. **技術検証（PoC）**
   - Keycloak + Kong連携
   - OTP + PostgreSQL/PostGIS性能
   - Flutter + REST API通信

2. **開発環境構築**
   - Dockerコンテナ作成
   - 開発用docker-compose.yml
   - 初期CI/CDパイプライン

3. **詳細設計**
   - API仕様書（OpenAPI）
   - データベース設計
   - セキュリティ設計

この実装計画は、オープンソースコミュニティの参加を前提とし、透明性と拡張性を重視した設計となっています。各フェーズは独立して価値を提供できるよう設計されており、段階的なリリースが可能です。