# Contributing to OpenMaaS

[日本語](#japanese) | [English](#english)

---

## English

Thank you for your interest in contributing to OpenMaaS! This document provides guidelines and information for contributors.

**OpenMaaS is developed by [MaaS Creative Co. Ltd](https://maas-creative.com)**

### 🤝 Code of Conduct

This project adheres to a Code of Conduct that we expect all participants to follow. Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before contributing.

### 🚀 Getting Started

#### Prerequisites

- Node.js 18+ and npm 9+
- Docker and Docker Compose
- Git
- Basic understanding of TypeScript, NestJS, and PostgreSQL

#### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/OpenMaaS.git
   cd OpenMaaS
   ```

2. **Environment Setup**
   ```bash
   # Run the automated setup script
   ./scripts/dev-setup.sh
   
   # Or manually:
   npm install
   npm run docker:up
   npm run dev
   ```

3. **Verify Setup**
   - All services should start without errors
   - Tests should pass: `npm run test`
   - Linting should pass: `npm run lint`

### 🏗️ Project Structure

```
OpenMaaS/
├── services/           # Microservices
│   ├── auth-service/   # Authentication & authorization
│   ├── user-service/   # User management
│   ├── transit-service/# Transit data & GTFS processing
│   ├── route-service/  # Route planning
│   ├── booking-service/# Booking management
│   └── payment-service/# Payment processing
├── libs/              # Shared libraries
│   ├── common/        # Common utilities
│   └── types/         # Shared TypeScript types
├── infrastructure/    # Infrastructure configs
└── docs/             # Documentation
```

### 🔧 Development Workflow

#### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
```

#### 2. Make Changes

- Follow existing code patterns and conventions
- Write tests for new functionality
- Update documentation if needed
- Ensure TypeScript strict mode compliance

#### 3. Testing

```bash
# Run all tests
npm run test

# Run tests for specific service
cd services/service-name
npm run test

# Run specific test file
npx jest src/__tests__/specific.test.ts
```

#### 4. Code Quality

```bash
# Lint all code
npm run lint

# Format code
npm run format

# Type checking
npm run build
```

#### 5. Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Feature
git commit -m "feat(auth): add OAuth2 support for Google"

# Bug fix
git commit -m "fix(payment): resolve Stripe webhook validation issue"

# Documentation
git commit -m "docs: update API documentation for route service"

# Refactor
git commit -m "refactor(user): improve user preference validation"
```

#### 6. Pull Request

1. Push your branch to your fork
2. Create a Pull Request with:
   - Clear title and description
   - Reference related issues
   - Screenshots/videos if UI changes
   - Testing instructions

### 📋 Coding Standards

#### TypeScript Guidelines

- Use strict TypeScript configuration
- Prefer explicit types over `any`
- Use interfaces for object shapes
- Follow NestJS patterns and decorators

#### API Design

- Follow RESTful conventions
- Use proper HTTP status codes
- Include comprehensive error handling
- Document APIs with Swagger decorators

#### Database Guidelines

- Use TypeORM entities with proper decorators
- Follow PostgreSQL naming conventions
- Use migrations for schema changes
- Include proper indexes for performance

#### Testing Standards

- Write unit tests for services and utilities
- Write integration tests for controllers
- Maintain minimum 80% code coverage
- Use descriptive test names

### 🏷️ Issue Labels

- `bug`: Something isn't working
- `enhancement`: New feature request
- `documentation`: Documentation improvements
- `good first issue`: Good for newcomers
- `help wanted`: Extra attention needed
- `priority/high`: High priority issue
- `service/auth`: Auth service related
- `service/user`: User service related
- etc.

### 🔍 Pull Request Review Process

1. **Automated Checks**: All CI checks must pass
2. **Code Review**: At least one maintainer review required
3. **Testing**: Manual testing if needed
4. **Documentation**: Ensure docs are updated
5. **Merge**: Squash and merge preferred

### 🌍 Internationalization

- Use i18n for all user-facing strings
- Support both English and Japanese
- Test with different locales
- Consider right-to-left languages for future support

### 🛡️ Security Guidelines

- Never commit secrets or API keys
- Use environment variables for sensitive data
- Follow OWASP security practices
- Report security vulnerabilities privately

### 📚 Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [TypeORM Documentation](https://typeorm.io/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Kong Documentation](https://docs.konghq.com/)
- [Stripe API Documentation](https://stripe.com/docs/api)

### ❓ Getting Help

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and community chat
- **Documentation**: Check `/docs` directory first

---

## Japanese

OpenMaaSへの貢献にご興味をお持ちいただき、ありがとうございます！このドキュメントは貢献者向けのガイドラインと情報を提供します。

**OpenMaaSは[MaaS Creative Co. Ltd](https://maas-creative.com)によって開発されています**

### 🤝 行動規範

このプロジェクトは、すべての参加者に従っていただく行動規範に従います。貢献する前に[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)をお読みください。

### 🚀 はじめに

#### 前提条件

- Node.js 18+ および npm 9+
- Docker および Docker Compose
- Git
- TypeScript、NestJS、PostgreSQLの基本的な理解

#### 開発環境のセットアップ

1. **フォークとクローン**
   ```bash
   git clone https://github.com/YOUR_USERNAME/OpenMaaS.git
   cd OpenMaaS
   ```

2. **環境設定**
   ```bash
   # 自動セットアップスクリプトを実行
   ./scripts/dev-setup.sh
   
   # または手動で:
   npm install
   npm run docker:up
   npm run dev
   ```

3. **セットアップの確認**
   - すべてのサービスがエラーなく起動すること
   - テストが通ること: `npm run test`
   - リントが通ること: `npm run lint`

### 🔧 開発ワークフロー

#### 1. フィーチャーブランチの作成

```bash
git checkout -b feature/your-feature-name
# または
git checkout -b fix/issue-description
```

#### 2. 変更の実施

- 既存のコードパターンと規約に従う
- 新機能にはテストを書く
- 必要に応じてドキュメントを更新
- TypeScriptのstrictモード準拠を確保

#### 3. テスト

```bash
# すべてのテストを実行
npm run test

# 特定のサービスのテストを実行
cd services/service-name
npm run test

# 特定のテストファイルを実行
npx jest src/__tests__/specific.test.ts
```

#### 4. コード品質

```bash
# すべてのコードをリント
npm run lint

# コードをフォーマット
npm run format

# 型チェック
npm run build
```

#### 5. コミットガイドライン

[Conventional Commits](https://www.conventionalcommits.org/)に従います：

```bash
# 機能追加
git commit -m "feat(auth): add OAuth2 support for Google"

# バグ修正
git commit -m "fix(payment): resolve Stripe webhook validation issue"

# ドキュメント
git commit -m "docs: update API documentation for route service"

# リファクタリング
git commit -m "refactor(user): improve user preference validation"
```

#### 6. プルリクエスト

1. あなたのフォークにブランチをプッシュ
2. 以下を含むプルリクエストを作成：
   - 明確なタイトルと説明
   - 関連する課題への参照
   - UI変更の場合はスクリーンショット/動画
   - テスト手順

### 📋 コーディング標準

#### TypeScriptガイドライン

- strictなTypeScript設定を使用
- `any`よりも明示的な型を優先
- オブジェクト形状にはinterfaceを使用
- NestJSのパターンとデコレータに従う

#### API設計

- RESTful規約に従う
- 適切なHTTPステータスコードを使用
- 包括的なエラーハンドリングを含める
- SwaggerデコレータでAPIを文書化

#### データベースガイドライン

- 適切なデコレータ付きTypeORMエンティティを使用
- PostgreSQLの命名規約に従う
- スキーマ変更にはマイグレーションを使用
- パフォーマンスのための適切なインデックスを含める

#### テスト標準

- サービスとユーティリティのユニットテストを書く
- コントローラの統合テストを書く
- 最低80%のコードカバレッジを維持
- 説明的なテスト名を使用

### ❓ ヘルプの取得

- **GitHub Issues**: バグと機能リクエスト用
- **GitHub Discussions**: 質問とコミュニティチャット用
- **ドキュメント**: まず`/docs`ディレクトリを確認

---

© 2024 MaaS Creative Co. Ltd. All rights reserved.