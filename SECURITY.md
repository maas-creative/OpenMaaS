# Security Policy

[日本語](#japanese) | [English](#english)

---

## English

### Reporting Security Vulnerabilities

At MaaS Creative Co. Ltd, we take the security of OpenMaaS seriously. If you believe you have found a security vulnerability in our code, we encourage you to let us know right away. We will investigate all legitimate reports and do our best to quickly fix the problem.

### How to Report

Please **DO NOT** create a public GitHub issue for security vulnerabilities.

Instead, please report security vulnerabilities by emailing:
- security@maas-creative.com

### What to Include

When reporting a vulnerability, please include:

1. **Description**: A brief description of the vulnerability
2. **Steps to Reproduce**: Detailed steps to reproduce the issue
3. **Impact**: The potential impact of the vulnerability
4. **Affected Components**: Which services or components are affected
5. **Suggested Fix**: If you have a suggestion for how to fix the issue

### Response Process

1. **Acknowledgment**: We will acknowledge receipt of your vulnerability report within 48 hours
2. **Investigation**: We will investigate and validate the reported vulnerability
3. **Resolution**: We will work on a fix and coordinate with you on the timeline
4. **Disclosure**: We will coordinate with you on public disclosure after the fix is deployed

### Security Best Practices

When contributing to OpenMaaS, please follow these security practices:

#### Authentication & Authorization
- Always use the provided authentication middleware
- Implement proper role-based access control
- Never expose sensitive user data in API responses

#### Data Protection
- Use parameterized queries to prevent SQL injection
- Validate and sanitize all user inputs
- Encrypt sensitive data at rest and in transit

#### Secrets Management
- Never commit secrets, API keys, or credentials to the repository
- Use environment variables for all sensitive configuration
- Rotate keys and secrets regularly

#### Dependencies
- Keep all dependencies up to date
- Regularly audit dependencies for known vulnerabilities
- Use `npm audit` to check for security issues

#### API Security
- Implement rate limiting on all endpoints
- Use HTTPS for all communications
- Validate all input data against schemas
- Implement proper CORS policies

### Security Features in OpenMaaS

OpenMaaS includes several built-in security features:

- **JWT Authentication**: Secure token-based authentication
- **Keycloak Integration**: Enterprise-grade identity management
- **API Gateway Security**: Kong provides rate limiting, authentication, and access control
- **Input Validation**: All DTOs use class-validator for input sanitization
- **SQL Injection Protection**: TypeORM provides parameterized queries
- **XSS Protection**: Automatic output encoding in responses

### Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
| < 1.0   | :x:                |

---

## Japanese

### セキュリティ脆弱性の報告

MaaS Creative Co. Ltdでは、OpenMaaSのセキュリティを重視しています。私たちのコードにセキュリティ脆弱性を発見したと思われる場合は、すぐにお知らせください。正当な報告をすべて調査し、問題を迅速に修正するよう最善を尽くします。

### 報告方法

セキュリティ脆弱性について、公開のGitHub issueを作成**しないでください**。

代わりに、以下のメールアドレスにセキュリティ脆弱性を報告してください：
- security@maas-creative.com

### 報告に含めるべき内容

脆弱性を報告する際は、以下を含めてください：

1. **説明**: 脆弱性の簡潔な説明
2. **再現手順**: 問題を再現するための詳細な手順
3. **影響**: 脆弱性の潜在的な影響
4. **影響を受けるコンポーネント**: どのサービスまたはコンポーネントが影響を受けるか
5. **修正案**: 問題の修正方法に関する提案がある場合

### 対応プロセス

1. **受領確認**: 脆弱性報告の受領を48時間以内に確認します
2. **調査**: 報告された脆弱性を調査し、検証します
3. **解決**: 修正に取り組み、タイムラインについて調整します
4. **開示**: 修正がデプロイされた後、公開開示について調整します

### セキュリティベストプラクティス

OpenMaaSに貢献する際は、以下のセキュリティプラクティスに従ってください：

#### 認証と認可
- 提供された認証ミドルウェアを常に使用する
- 適切なロールベースアクセス制御を実装する
- APIレスポンスで機密ユーザーデータを公開しない

#### データ保護
- SQLインジェクションを防ぐためにパラメータ化されたクエリを使用する
- すべてのユーザー入力を検証およびサニタイズする
- 保存時および転送時に機密データを暗号化する

#### シークレット管理
- シークレット、APIキー、認証情報をリポジトリにコミットしない
- すべての機密設定に環境変数を使用する
- キーとシークレットを定期的にローテーションする

#### 依存関係
- すべての依存関係を最新に保つ
- 既知の脆弱性について依存関係を定期的に監査する
- `npm audit`を使用してセキュリティ問題をチェックする

#### APIセキュリティ
- すべてのエンドポイントにレート制限を実装する
- すべての通信にHTTPSを使用する
- すべての入力データをスキーマに対して検証する
- 適切なCORSポリシーを実装する

### OpenMaaSのセキュリティ機能

OpenMaaSには、以下のセキュリティ機能が組み込まれています：

- **JWT認証**: 安全なトークンベース認証
- **Keycloak統合**: エンタープライズグレードのアイデンティティ管理
- **APIゲートウェイセキュリティ**: Kongによるレート制限、認証、アクセス制御
- **入力検証**: すべてのDTOがclass-validatorを使用して入力をサニタイズ
- **SQLインジェクション保護**: TypeORMがパラメータ化されたクエリを提供
- **XSS保護**: レスポンスでの自動出力エンコーディング

### サポートされているバージョン

| バージョン | サポート状況        |
| --------- | ------------------ |
| 1.x       | :white_check_mark: |
| < 1.0     | :x:                |

---

© 2024 MaaS Creative Co. Ltd. All rights reserved.