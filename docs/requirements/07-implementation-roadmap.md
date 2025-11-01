# 統合実装ロードマップ

**プロジェクト**: OpenMaaS - オープンソースMaaSプラットフォーム  
**バージョン**: 1.0  
**更新日**: 2025-11-01  
**ステータス**: 進行中（Phase 2-3）

---

## 📋 目次

1. [概要](#概要)
2. [プロジェクト全体像](#プロジェクト全体像)
3. [Phase 1: 基盤構築](#phase-1-基盤構築)
4. [Phase 2: コア機能開発](#phase-2-コア機能開発)
5. [Phase 3: ユーザー向け機能](#phase-3-ユーザー向け機能)
6. [Phase 4: フロントエンド開発](#phase-4-フロントエンド開発)
7. [Phase 5: 運用・拡張機能](#phase-5-運用拡張機能)
8. [リスク管理計画](#リスク管理計画)
9. [リソース計画](#リソース計画)
10. [進捗管理](#進捗管理)

---

## 概要

本ドキュメントは、OpenMaaSプラットフォームの包括的な実装計画を示します。既存の`implementation-plan.md`と`prioritized-roadmap.md`を統合し、実装の優先順位、依存関係、タイムラインを明確化します。

### 統合の目的

- **一元管理**: 複数のロードマップドキュメントを統合
- **追跡可能性**: 要件から実装までの追跡を容易に
- **リソース最適化**: 開発リソースの効率的配分
- **リスク管理**: 依存関係とリスクの明確化

---

## プロジェクト全体像

### マイルストーン概要

```
Timeline: 14ヶ月（2024年6月 〜 2025年8月）

Phase 1: 基盤構築（1-2ヶ月）    ✅ 完了（2024年8月）
  ├─ プロジェクト基盤
  ├─ 認証・認可基盤
  └─ APIゲートウェイ

Phase 2: コア機能開発（2-3ヶ月）  🔄 進行中 80%（2024年11月）
  ├─ ユーザー管理サービス
  ├─ GTFSデータ処理
  └─ 経路探索エンジン

Phase 3: ユーザー向け機能（2-3ヶ月）  🔄 進行中 40%（2025年2月）
  ├─ リアルタイム情報
  ├─ 予約管理
  └─ 決済統合

Phase 4: フロントエンド開発（3-4ヶ月）  📅 計画中（2025年6月）
  ├─ Webアプリケーション
  └─ モバイルアプリ

Phase 5: 運用・拡張機能（1-2ヶ月）  📅 計画中（2025年8月）
  ├─ 通知サービス
  ├─ 分析・レポーティング
  └─ 管理者ダッシュボード
```

---

### 進捗状況サマリー

| フェーズ | 期間 | 進捗率 | ステータス | 完了基準達成度 |
|---------|------|--------|-----------|-------------|
| Phase 1 | M1-M2 | 100% | ✅ 完了 | 10/10 |
| Phase 2 | M3-M5 | 80% | 🔄 進行中 | 24/30 |
| Phase 3 | M6-M8 | 40% | 🔄 進行中 | 12/30 |
| Phase 4 | M9-M12 | 10% | 📅 計画中 | 2/20 |
| Phase 5 | M13-M14 | 0% | 📅 計画中 | 0/10 |
| **全体** | **14ヶ月** | **49%** | 🔄 **進行中** | **48/100** |

---

### ビジネス価値マッピング

| フェーズ | 主要成果物 | ビジネス価値 | 市場投入可能性 |
|---------|-----------|------------|--------------|
| Phase 1 | 開発環境、認証基盤 | 開発速度向上（20%） | ❌ 不可 |
| Phase 2 | ユーザー管理、経路探索 | MVP提供可能 | ✅ クローズドβ |
| Phase 3 | リアルタイム情報、予約 | エンドユーザー提供 | ✅ オープンβ |
| Phase 4 | Web/モバイルアプリ | 一般公開可能 | ✅ 正式リリース |
| Phase 5 | 運用ツール、分析 | 運用最適化 | ✅ エンタープライズ対応 |

---

## Phase 1: 基盤構築

### 📅 期間: Month 1-2（2024年6月〜8月）
### ✅ ステータス: 完了
### 🎯 ビジネス価値: 開発環境整備、チーム生産性向上

---

### 1.1 プロジェクト基盤のセットアップ

#### 目的
開発環境とプロジェクト構造の確立

#### タスク
- [x] モノレポ構造の設定（Turborepを使用）
- [x] Docker Composeによるローカル開発環境
- [x] Kubernetes/Helmチャートの準備
- [x] CI/CDパイプライン（GitHub Actions）
- [x] コーディング規約とlinter設定

#### 成果物
```
openmaas/
├── services/           # マイクロサービス
├── libs/              # 共有ライブラリ
├── apps/              # フロントエンドアプリ
├── infrastructure/    # K8s/Docker設定
├── docs/              # ドキュメント
└── scripts/           # ビルド/デプロイスクリプト
```

#### 完了基準
- [x] 全開発者が1コマンドで環境構築可能
- [x] CI/CDパイプラインが自動実行
- [x] Linterチェックが全サービスで動作
- [x] Docker Composeで全サービスが起動

#### 実績
- **完了日**: 2024年8月15日
- **所要時間**: 6週間
- **課題**: Kubernetes設定に2週間追加
- **成果**: 開発セットアップ時間を3時間→15分に短縮

---

### 1.2 認証・認可基盤（Keycloak）

#### 目的
セキュアなユーザー管理の基盤確立

#### タスク
- [x] KeycloakのDockerコンテナ設定
- [x] レルム、クライアント、ロールの設定
- [x] OAuth2/OpenID Connect設定
- [x] マルチテナント対応（利用者、事業者、管理者）

#### 技術詳細
- **Keycloak Version**: 22.0
- **認証方式**: OAuth 2.0 / OpenID Connect
- **ロール定義**:
  - `USER`: 一般利用者
  - `OPERATOR`: 交通事業者
  - `PROVIDER`: チケット提供者
  - `ADMIN`: システム管理者

#### 完了基準
- [x] 4つのロールが正しく動作
- [x] JWT トークンが正しく発行・検証される
- [x] セッション管理が動作
- [x] パスワードリセット機能が動作

#### 実績
- **完了日**: 2024年7月20日
- **所要時間**: 4週間
- **課題**: ロール権限設計に1週間追加

---

### 1.3 APIゲートウェイ（Kong）

#### 目的
統一されたAPIエントリーポイントの確立

#### タスク
- [x] Kongの選定と設定
- [x] ルーティング設定
- [x] レート制限とAPI Key管理
- [x] 認証プラグインの統合

#### 技術詳細
```yaml
# Kong設定例
services:
  - name: auth-service
    url: http://auth-service:3001
    routes:
      - name: auth-route
        paths: ["/api/v1/auth"]
    plugins:
      - name: rate-limiting
        config:
          minute: 60
          hour: 1000
```

#### 完了基準
- [x] 全サービスがKong経由でアクセス可能
- [x] レート制限が正しく動作
- [x] 認証プラグインが統合
- [x] API リクエストログが記録

#### 実績
- **完了日**: 2024年8月10日
- **所要時間**: 3週間
- **課題**: Keycloak統合に1週間追加

---

## Phase 2: コア機能開発

### 📅 期間: Month 3-5（2024年9月〜11月）
### 🔄 ステータス: 進行中（80%完了）
### 🎯 ビジネス価値: MVP提供可能、クローズドβテスト開始

---

### 2.1 ユーザー管理サービス

#### 目的
ユーザープロファイルと権限管理の実現

#### 技術スタック
- **言語**: Node.js (NestJS) + TypeScript
- **データベース**: PostgreSQL
- **キャッシュ**: Redis

#### 機能一覧
- [x] ユーザー登録/プロファイル管理
- [x] 権限管理（RBAC）
- [x] 利用履歴管理
- [x] 設定管理
- [⏳] お気に入りルート管理（Phase 3に移動）

#### API設計
```typescript
POST   /api/v1/users              # ユーザー登録
GET    /api/v1/users/:id          # ユーザー取得
PUT    /api/v1/users/:id          # ユーザー更新
DELETE /api/v1/users/:id          # ユーザー削除
GET    /api/v1/users/:id/trips    # 旅行履歴取得
GET    /api/v1/users/:id/tickets  # チケット履歴取得
```

#### 完了基準
- [x] 全APIエンドポイントが実装
- [x] 単体テストカバレッジ > 80%
- [x] 統合テストが合格
- [⏳] パフォーマンステスト（応答時間 < 200ms）

#### 進捗状況
- **進捗率**: 95%
- **残タスク**: パフォーマンス最適化
- **課題**: データベースクエリの最適化が必要

---

### 2.2 GTFSデータ処理サービス

#### 目的
交通事業者のGTFSデータを取り込み・正規化

#### 技術スタック
- **言語**: Python (FastAPI)
- **データベース**: PostgreSQL + PostGIS
- **スケジューラ**: Celery + Redis

#### 機能一覧
- [x] GTFSフィード取り込み
- [x] データ検証と正規化
- [x] 定期的な更新処理（日次）
- [x] 空間インデックスの構築
- [⏳] GTFS-RT処理（進行中）

#### データモデル
```sql
-- 停留所
CREATE TABLE stops (
  stop_id VARCHAR PRIMARY KEY,
  stop_name VARCHAR NOT NULL,
  stop_lat DECIMAL(10,6),
  stop_lon DECIMAL(10,6),
  location GEOGRAPHY(POINT, 4326),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 路線
CREATE TABLE routes (
  route_id VARCHAR PRIMARY KEY,
  agency_id VARCHAR,
  route_short_name VARCHAR,
  route_long_name VARCHAR,
  route_type INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 空間インデックス
CREATE INDEX idx_stops_location ON stops USING GIST (location);
```

#### 完了基準
- [x] GTFSデータ取り込みが動作
- [x] データ検証が実装
- [x] 日次更新が自動実行
- [⏳] GTFS-RTリアルタイム処理

#### 進捗状況
- **進捗率**: 85%
- **残タスク**: GTFS-RTストリーミング処理
- **課題**: 大規模データ処理のパフォーマンス最適化

---

### 2.3 経路探索エンジン統合

#### 目的
OpenTripPlannerを中心とした経路探索機能

#### 技術スタック
- **経路探索エンジン**: OpenTripPlanner (OTP)
- **ラッパーAPI**: Node.js (NestJS)
- **キャッシュ**: Redis

#### タスク
- [x] OTPサーバーのDocker化
- [x] グラフビルダーの自動化
- [x] 経路探索API実装
- [x] 結果キャッシング（Redis）
- [⏳] マルチモーダル最適化

#### API設計
```
GET /api/v1/routes/search
  ?from=35.6895,139.6917     # 出発地（緯度,経度）
  &to=35.6812,139.7671       # 目的地（緯度,経度）
  &time=2025-01-01T10:00:00  # 出発時刻
  &mode=TRANSIT,WALK         # 移動手段
  &maxWalkDistance=1000      # 最大徒歩距離（m）
  &numItineraries=3          # ルート候補数

レスポンス例:
{
  "itineraries": [
    {
      "duration": 1800,        # 所要時間（秒）
      "walkTime": 600,         # 徒歩時間（秒）
      "transitTime": 1200,     # 乗車時間（秒）
      "waitingTime": 300,      # 待ち時間（秒）
      "fare": {
        "currency": "JPY",
        "amount": 200
      },
      "legs": [
        {
          "mode": "WALK",
          "from": {...},
          "to": {...},
          "duration": 300
        },
        {
          "mode": "BUS",
          "routeName": "都営バス 都01",
          "from": {...},
          "to": {...},
          "duration": 900
        }
      ]
    }
  ]
}
```

#### 完了基準
- [x] 基本的な経路検索が動作
- [x] 複数ルート候補の提案
- [x] キャッシングによる高速化
- [⏳] GTFS-RTによるリアルタイム反映

#### 進捗状況
- **進捗率**: 80%
- **残タスク**: GTFS-RT統合、マルチモーダル最適化
- **課題**: 複雑な乗換案内の精度向上

---

### 2.4 マルチモーダル交通統合の基盤構築（prioritized-roadmap統合）

#### 目的
各交通モードのデータを統合し、都市交通の全体像をリアルタイムに把握

#### 主要ユースケース
- 利用者向け経路検索と予約の統合体験
- 運営側の交通リソースの可視化と配分最適化

#### 優先アクション
1. [x] マイクロサービスAPI契約とイベントスキーマ定義
2. [🔄] サービス間メッセージング (gRPC) 実装（60%）
3. [⏳] 外部データソース（ライドシェア、マイクロモビリティ）コネクタ
4. [⏳] データレイク構築（PostgreSQL + PostGIS）

#### 完了条件
- [x] サービス間でユーザー・路線・予約情報を一元参照可能
- [⏳] CI上でAPIコントラクトテストが自動実行
- [⏳] 外部交通データが24時間以内に自動更新

#### KPI
- API レスポンス時間: 目標 < 200ms（現状 250ms）
- データ同期遅延: 目標 < 5秒（現状 10秒）
- API 可用性: 目標 > 99.9%（現状 99.5%）

---

## Phase 3: ユーザー向け機能

### 📅 期間: Month 6-8（2024年12月〜2025年2月）
### 🔄 ステータス: 進行中（40%完了）
### 🎯 ビジネス価値: エンドユーザー提供可能、オープンβテスト

---

### 3.1 リアルタイム情報サービス

#### 目的
GTFS-RTによるリアルタイム運行情報配信

#### 技術スタック
- **言語**: Node.js + WebSocket
- **メッセージング**: Redis Pub/Sub
- **プロトコル**: GTFS-Realtime (Protocol Buffers)

#### 機能一覧
- [🔄] GTFS-RTフィード処理（60%）
- [⏳] 車両位置追跡
- [⏳] 遅延情報配信
- [⏳] プッシュ通知

#### アーキテクチャ
```
GTFS-RT Feed → Feed Processor → Redis Pub/Sub → WebSocket Server → Client
```

#### WebSocket API
```javascript
// クライアント側
const ws = new WebSocket('wss://api.openmaas.com/v1/realtime');

ws.on('message', (data) => {
  const update = JSON.parse(data);
  console.log('リアルタイム更新:', update);
});

// サーバー側配信
{
  "type": "TRIP_UPDATE",
  "trip_id": "JR_YAMANOTE_001",
  "delay": 180,  // 3分遅延（秒）
  "vehicle_position": {
    "lat": 35.6895,
    "lon": 139.6917
  },
  "timestamp": 1730462400
}
```

#### 完了基準
- [🔄] GTFS-RTフィードの自動処理
- [⏳] WebSocketでのリアルタイム配信
- [⏳] 遅延情報の正確な反映
- [⏳] プッシュ通知の送信

#### 進捗状況
- **進捗率**: 40%
- **残タスク**: WebSocket実装、プッシュ通知
- **課題**: 大量の同時接続処理の最適化

---

### 3.2 予約管理サービス

#### 目的
座席予約・車両予約の統合管理

#### 技術スタック
- **言語**: Java (Spring Boot)
- **データベース**: PostgreSQL
- **キャッシュ**: Redis

#### 機能一覧
- [⏳] 座席/車両予約
- [⏳] QRコード発行
- [⏳] キャンセル処理
- [⏳] 予約履歴管理

#### データモデル
```sql
CREATE TABLE bookings (
  booking_id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  trip_id VARCHAR NOT NULL,
  status VARCHAR NOT NULL,  -- PENDING, CONFIRMED, CANCELLED
  seat_number VARCHAR,
  qr_code TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_status ON bookings(status);
```

#### 完了基準
- [⏳] 予約フローの実装
- [⏳] QRコード生成・検証
- [⏳] 在庫管理との連携
- [⏳] キャンセルポリシーの実装

#### 進捗状況
- **進捗率**: 30%
- **残タスク**: 予約ロジック、QRコード検証
- **課題**: 在庫管理の同期処理

---

### 3.3 決済統合サービス

#### 目的
Stripeを使った安全な決済処理

#### 技術スタック
- **言語**: Node.js (NestJS)
- **決済ゲートウェイ**: Stripe
- **PCI DSS準拠**: Stripe SDKで実現

#### 機能一覧
- [x] クレジットカード決済（Stripe Checkout）
- [x] トランザクション管理
- [🔄] 返金処理（80%）
- [x] 決済履歴
- [⏳] 複数決済手段（Apple Pay, Google Pay）

#### Stripe統合
```typescript
// Stripe Checkout Session作成
const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  line_items: [
    {
      price_data: {
        currency: 'jpy',
        product_data: {
          name: '東京 → 大阪 新幹線チケット',
        },
        unit_amount: 13620, // 円
      },
      quantity: 1,
    },
  ],
  mode: 'payment',
  success_url: 'https://openmaas.com/success',
  cancel_url: 'https://openmaas.com/cancel',
  metadata: {
    booking_id: 'booking_123',
  },
});

// Webhook処理
app.post('/webhook', async (req, res) => {
  const event = stripe.webhooks.constructEvent(
    req.body,
    req.headers['stripe-signature'],
    webhookSecret
  );

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    // 予約確定処理
    await confirmBooking(session.metadata.booking_id);
  }

  res.json({received: true});
});
```

#### 完了基準
- [x] Stripe Checkoutが動作
- [x] Webhook処理が実装
- [🔄] 返金処理の実装
- [⏳] PCI DSS監査合格

#### 進捗状況
- **進捗率**: 70%
- **残タスク**: 返金自動化、Apple Pay統合
- **課題**: 複雑な返金ポリシーの実装

---

### 3.4 セキュリティと決済フローの実装（prioritized-roadmap統合）

#### 主要ユースケース
- モバイルチケットの動的QRコード発券
- 事業者ロール別のダッシュボードアクセス制御
- Stripeベースの決済処理と不正防止

#### 優先アクション
1. [x] Keycloak連携によるRBACと多要素認証
2. [x] Stripe Checkout / Payment Intent実装
3. [x] QRチケット生成・検証サービス（30秒有効署名付きトークン）
4. [🔄] セキュリティ監査ログ、脆弱性スキャン（60%）

#### 完了条件
- [x] RBACと決済がE2Eテストで検証
- [⏳] 不正利用検知のモニタリングダッシュボード
- [⏳] セキュリティポリシー文書化

---

## Phase 4: フロントエンド開発

### 📅 期間: Month 9-12（2025年3月〜6月）
### 📅 ステータス: 計画中（10%完了 - デモ版実装済み）
### 🎯 ビジネス価値: 一般公開可能、正式リリース

---

### 4.1 Webアプリケーション

#### 目的
React + Next.jsによるモダンWebアプリ

#### 技術スタック
- **フレームワーク**: Next.js 15.3.3 + React 19
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS 4
- **UIライブラリ**: shadcn/ui
- **状態管理**: TanStack Query (React Query)

#### 主要画面
- [x] ホーム/経路検索（デモ版）
- [x] 検索結果/詳細（デモ版）
- [x] 予約/決済（デモ版）
- [x] アカウント管理（デモ版）
- [x] 利用履歴（デモ版）
- [⏳] 本番環境対応

#### 画面遷移フロー
```
[ホーム] → [経路検索] → [検索結果一覧]
                            ↓
                         [ルート詳細]
                            ↓
                       [予約確認画面]
                            ↓
                       [決済画面]
                            ↓
                       [QRチケット表示]
```

#### PWA機能
- [🔄] Service Worker実装（50%）
- [⏳] オフライン対応
- [⏳] プッシュ通知
- [⏳] インストールプロンプト

#### 完了基準
- [⏳] Lighthouse スコア > 90
- [⏳] Core Web Vitals 合格
- [⏳] PWAインストール可能
- [⏳] 全画面レスポンシブ対応

#### 進捗状況
- **進捗率**: 30%（デモ版完成、本番化待ち）
- **残タスク**: PWA完全対応、パフォーマンス最適化
- **課題**: 地図統合（Mapbox本番環境）

---

### 4.2 モバイルアプリ（将来計画）

#### 目的
Flutter によるクロスプラットフォームアプリ

#### 技術スタック
- **フレームワーク**: Flutter + Dart
- **状態管理**: BLoC Pattern
- **アーキテクチャ**: Clean Architecture

#### 機能（Phase 5以降）
- [ ] クロスプラットフォーム対応（iOS/Android）
- [ ] オフライン対応
- [ ] 位置情報サービス
- [ ] プッシュ通知
- [ ] ディープリンク

---

### 4.3 ユーザー体験（UX）の強化（prioritized-roadmap統合）

#### 主要ユースケース
- モバイルブラウザでのPWAインストールとオフライン利用
- ライブ交通情報のリアルタイム同期

#### 優先アクション
1. [🔄] Next.jsベースフロントエンドのPWA対応（50%）
2. [⏳] IndexedDB / Cache Storageによるオフラインキャッシュ
3. [⏳] WebSocket / SSEによるリアルタイム更新UI統合
4. [🔄] デザインシステム整備（70%）

#### 完了条件
- [⏳] Lighthouse PWAスコア > 90
- [⏳] 主要ユーザーストーリーがデバイス横断でQA合格
- [⏳] アクセシビリティWCAG 2.1 AA準拠

---

## Phase 5: 運用・拡張機能

### 📅 期間: Month 13-14（2025年7月〜8月）
### 📅 ステータス: 計画中
### 🎯 ビジネス価値: 運用最適化、エンタープライズ対応

---

### 5.1 通知サービス

#### 機能
- [ ] メール通知（SendGrid/Amazon SES）
- [ ] プッシュ通知（FCM/APNs）
- [ ] SMS通知
- [ ] アプリ内通知

---

### 5.2 分析・レポーティング

#### 機能
- [ ] 利用統計ダッシュボード
- [ ] 事業者向けレポート
- [ ] データエクスポート機能
- [ ] BI連携（Metabase/Superset）

---

### 5.3 管理者ダッシュボード

#### 機能
- [ ] システム監視
- [ ] ユーザー管理
- [ ] コンテンツ管理
- [ ] 設定管理

---

### 5.4 開発者向けAPIとドキュメント整備（prioritized-roadmap統合）

#### 主要ユースケース
- パートナー企業がREST / GraphQL APIを利用して独自アプリを実装
- サードパーティによるデータ可視化ツール連携

#### 優先アクション
1. [x] RESTful API設計とバージョニング戦略
2. [x] OpenAPI / Swagger ドキュメント公開
3. [⏳] 開発者ポータル（API Key管理、サンプルコード）
4. [⏳] SDK / Postman コレクション / Quick Start ガイド

#### 完了条件
- [⏳] APIコール平均レスポンスSLA定義とモニタリング
- [⏳] ドキュメントCI自動生成・公開

---

### 5.5 インフラと運用基盤の構築（prioritized-roadmap統合）

#### 主要ユースケース
- マイクロサービスをKubernetes上で自動スケーリング
- 地理情報処理をPostGIS / Redisで高速化

#### 優先アクション
1. [🔄] Docker ComposeからKubernetes (Helm) へのデプロイ移行（40%）
2. [⏳] PostgreSQL + PostGIS、Redis、Kafkaのコード化
3. [⏳] Kong GatewayとKeycloakの統合
4. [⏳] Observability（Prometheus, Grafana, OpenTelemetry）統合

#### 完了条件
- [⏳] ステージング環境でブルーグリーンデプロイ自動化
- [⏳] SLA / SLOに沿った運用監視実施

---

## リスク管理計画

### 高リスク項目

| リスク | 影響度 | 発生確率 | 対策 | 担当 | ステータス |
|--------|--------|---------|------|------|-----------|
| GTFS-RT処理の複雑性 | 高 | 中 | 段階的実装、専門家アサイン | データエンジニア | 🔄 対策中 |
| 大規模トラフィック処理 | 高 | 中 | 負荷テスト、オートスケーリング | DevOps | ⏳ 計画中 |
| 決済処理の障害 | 高 | 低 | Stripe冗長化、手動復旧手順 | バックエンドリード | ✅ 対策済み |
| セキュリティ脆弱性 | 高 | 中 | 週次スキャン、ペネトレーションテスト | セキュリティ担当 | 🔄 対策中 |
| 外部API依存 | 中 | 高 | フォールバック実装、キャッシング | バックエンドチーム | 🔄 対策中 |
| 人的リソース不足 | 中 | 中 | 優先順位見直し、外部支援 | PM | 🔄 監視中 |

---

### リスク対応戦略

#### 1. 技術的リスク
- **複雑性**: マイクロサービス複雑性 → 段階的導入、ドキュメント整備
- **性能**: 大規模データ処理 → キャッシング戦略、インデックス最適化
- **統合**: 外部システム連携 → 抽象化レイヤー、モック開発

#### 2. 運用リスク
- **スケーラビリティ**: 需要増加 → 自動スケーリング設計
- **セキュリティ**: 個人情報保護 → セキュリティファースト設計
- **可用性**: システム停止 → 冗長化、障害復旧計画

---

## リソース計画

### チーム構成

#### 現在の構成（Phase 2-3）

| 役割 | 人数 | 主な担当 | 稼働率 |
|------|------|---------|--------|
| プロジェクトマネージャー | 1 | 全体統括、ステークホルダー調整 | 100% |
| バックエンドリード | 1 | アーキテクチャ設計、API設計 | 100% |
| バックエンド開発者 | 3 | マイクロサービス実装 | 100% |
| フロントエンドリード | 1 | Web/モバイル開発リード | 100% |
| フロントエンド開発者 | 2 | UI/UX実装 | 100% |
| データエンジニア | 1 | GTFS処理、地理空間データ | 100% |
| DevOpsエンジニア | 1 | インフラ、CI/CD | 80% |
| QAエンジニア | 1 | テスト設計・実行 | 60% |
| **合計** | **11名** | - | **平均 95%** |

#### Phase 4-5 予定構成

| 役割 | 追加人数 | 理由 |
|------|---------|------|
| フロントエンド開発者 | +1 | PWA・モバイル対応強化 |
| DevOps | +1 | Kubernetes本番運用 |
| セキュリティ担当 | +0.5 | セキュリティ監査強化 |
| **合計追加** | **+2.5名** | - |

---

### 予算計画

| カテゴリ | Phase 1-2 | Phase 3-4 | Phase 5 | 合計 |
|---------|----------|----------|---------|------|
| 人件費 | ¥20M | ¥30M | ¥15M | ¥65M |
| インフラ（AWS/GCP） | ¥2M | ¥4M | ¥3M | ¥9M |
| 外部サービス（Stripe, Mapbox等） | ¥1M | ¥2M | ¥2M | ¥5M |
| ツール・ライセンス | ¥1M | ¥1M | ¥1M | ¥3M |
| 予備費（10%） | ¥2.4M | ¥3.7M | ¥2.1M | ¥8.2M |
| **合計** | **¥26.4M** | **¥40.7M** | **¥23.1M** | **¥90.2M** |

---

## 進捗管理

### KPI定義

| KPI | 目標値 | 現状値 | 達成率 | トレンド |
|-----|--------|--------|--------|---------|
| フェーズ完了率 | 100% (Phase 2) | 80% | 80% | ↗️ |
| コードカバレッジ | > 80% | 75% | 93.75% | ↗️ |
| API応答時間 | < 200ms | 250ms | 80% | → |
| システム稼働率 | > 99.9% | 99.5% | 99.6% | ↗️ |
| ユーザー満足度（β） | > 4.0/5.0 | 3.8/5.0 | 95% | ↗️ |
| バグ解決時間 | < 48h | 36h | 133% | ✅ |

---

### 週次レポート形式

```markdown
# 週次進捗レポート（2025-W45）

## サマリー
- 全体進捗: 49% → 52% (+3%)
- Phase 2: 80% → 85% (+5%)
- 主要達成: GTFS-RT基本処理完了

## 完了タスク
- [x] GTFS-RT Feed Processor実装
- [x] WebSocket基盤構築
- [x] 決済返金ロジック実装

## 進行中タスク
- [🔄] WebSocketリアルタイム配信（70%）
- [🔄] 予約管理API実装（40%）

## 課題・ブロッカー
- データベースパフォーマンス改善必要
  - 対策: インデックス追加、クエリ最適化
  - 担当: データエンジニア
  - 期限: 2025-11-15

## 次週の計画
- WebSocketリアルタイム配信完了
- 予約管理API 60%完了目標
```

---

### マイルストーンレビュー

| マイルストーン | 予定日 | 実績日 | 遅延 | レビュー結果 |
|-------------|--------|--------|------|------------|
| Phase 1完了 | 2024-08-31 | 2024-08-15 | -16日 | ✅ 合格 |
| Phase 2 中間レビュー | 2024-10-31 | 2024-10-28 | -3日 | ✅ 合格 |
| Phase 2 完了 | 2024-11-30 | 2024-12-07 | +7日 | 🔄 進行中 |
| Phase 3 中間レビュー | 2025-01-31 | - | - | 📅 予定 |
| Phase 3 完了 | 2025-02-28 | - | - | 📅 予定 |

---

## 次のアクション

### 今週（2025-W45）
1. [🔄] GTFS-RTリアルタイム配信完了
2. [🔄] 決済返金自動化テスト
3. [⏳] セキュリティ脆弱性スキャン実施

### 来週（2025-W46）
4. [⏳] 予約管理API実装加速
5. [⏳] Kubernetes本番環境構築開始
6. [⏳] Phase 3中間レビュー準備

### 今月（2025年11月）
7. [⏳] Phase 2完全完了
8. [⏳] Phase 3 40% → 60%達成
9. [⏳] βテストユーザー50名招待

---

## 変更管理

| バージョン | 日付 | 変更内容 | 承認者 |
|-----------|------|---------|--------|
| 1.0 | 2025-11-01 | 初版作成（implementation-plan.md + prioritized-roadmap.md統合） | PM |

---

## 参照ドキュメント

- [02-stakeholder-requirements.md](./02-stakeholder-requirements.md) - ステークホルダー要件
- [04-functional-requirements.md](./04-functional-requirements.md) - 機能要件
- [05-non-functional-requirements.md](./05-non-functional-requirements.md) - 非機能要件
- [../development/implementation-plan.md](../development/implementation-plan.md) - 旧実装計画（参照用）
- [../development/prioritized-roadmap.md](../development/prioritized-roadmap.md) - 旧優先ロードマップ（参照用）

---

© 2025 MaaS Creative Co. Ltd. All rights reserved.
