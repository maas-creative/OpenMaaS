# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
NEVER create static HTML files - user explicitly requested Next.js implementation only.

## Project Overview

OpenMaaS is an open-source Mobility as a Service (MaaS) platform that integrates various transportation services (public transit, ride-sharing, bike-sharing) into a unified platform. The project is currently in active development with a microservices architecture.

## Architecture

The system follows a microservices architecture with:

- **API Gateway**: Kong (ports 8000/8001) - Central entry point with rate limiting, authentication, and routing
- **Identity Provider**: Keycloak (port 8080) - Handles authentication and authorization
- **Database**: PostgreSQL with PostGIS extension for geospatial data
- **Cache**: Redis for session management and caching
- **Container Orchestration**: Docker Compose for development, designed for Kubernetes in production

### Implemented Services

1. **Auth Service** (port 3001) - JWT authentication, Keycloak integration, role-based access
2. **User Service** (port 3002) - User profiles, trip history, preferences management
3. **Transit Service** (port 3003) - GTFS data processing, transit information API
4. **Route Service** (port 3004) - Multi-modal route planning with OpenTripPlanner integration
5. **Booking Service** (port 3005) - Reservation and booking management with provider integration
6. **Payment Service** (port 3006) - Stripe payment processing, refunds, payment methods management

## Common Commands

### Development Setup

```bash
# First-time setup (checks prerequisites, starts all services)
./scripts/dev-setup.sh

# Start infrastructure services
npm run docker:up

# View logs
npm run docker:logs

# Stop services
npm run docker:down
```

### Development Commands

```bash
# Start all services in dev mode (with hot reload)
npm run dev

# Build all services
npm run build

# Run tests across all services
npm run test

# Lint all code
npm run lint

# Format code with Prettier
npm run format
```

### Service-Specific Development

When working on a specific service:

```bash
cd services/[service-name]
npm run dev        # Start with nodemon
npm run build      # Build TypeScript
npm run test       # Run service tests
npm run lint       # Lint service code
```

For User Service specifically:

```bash
cd services/user-service
npm run migration:generate -- -n MigrationName  # Generate migration
npm run migration:run                           # Run migrations
npm run migration:revert                        # Revert last migration
```

For Transit Service specifically:

```bash
cd services/transit-service
npm run migration:generate -- -n MigrationName  # Generate migration
npm run migration:run                           # Run migrations
npm run migration:revert                        # Revert last migration
```

For Booking Service specifically:

```bash
cd services/booking-service
npm run migration:generate -- -n MigrationName  # Generate migration
npm run migration:run                           # Run migrations
npm run migration:revert                        # Revert last migration
```

For Payment Service specifically:

```bash
cd services/payment-service
npm run migration:generate -- -n MigrationName  # Generate migration
npm run migration:run                           # Run migrations
npm run migration:revert                        # Revert last migration

# Stripe webhook testing (requires Stripe CLI)
stripe listen --forward-to localhost:3006/webhooks/stripe
```

### Testing Single Files

```bash
# Run specific test file
cd services/[service-name]
npx jest src/__tests__/specific.test.ts

# Run tests in watch mode
npx jest --watch
```

## Code Architecture

### Service Structure

Each microservice follows this structure:

```
services/[service-name]/
├── src/
│   ├── index.ts          # Service entry point
│   ├── app.module.ts     # NestJS root module
│   ├── config/           # Configuration files
│   ├── controllers/      # HTTP endpoints
│   ├── services/         # Business logic
│   ├── entities/         # TypeORM entities
│   ├── repositories/     # Data access layer
│   ├── dto/              # Data transfer objects
│   └── strategies/       # Passport strategies
├── package.json
├── tsconfig.json
└── Dockerfile
```

### Shared Libraries

```
libs/
├── common/               # Shared utilities, middleware, filters
│   ├── logger/          # Logging service
│   ├── filters/         # Exception filters
│   ├── interceptors/    # Request/response interceptors
│   └── utils/           # Helper functions
└── types/               # Shared TypeScript types
    ├── user.ts
    ├── auth.ts
    ├── transit.ts       # GTFS-based types
    ├── booking.ts
    └── payment.ts
```

### Key Architectural Patterns

1. **Repository Pattern**: Each service uses repositories for data access, separating business logic from database operations

2. **DTO Validation**: All incoming requests are validated using class-validator decorators

3. **JWT Authentication**: Services use JWT tokens with Passport strategies for authentication

4. **TypeORM Entities**: Database models use TypeORM decorators with PostgreSQL-specific features (JSONB, PostGIS)

5. **Global Exception Handling**: Common exception filters handle errors consistently across services

6. **Request/Response Transformation**: Interceptors ensure consistent API responses

### Database Schema

The PostgreSQL database uses schemas to separate concerns:

- `users` schema: User management data
- `transit` schema: GTFS transit data
- `booking` schema: Reservation data
- `payment` schema: Transaction data

### API Gateway Configuration

Kong configuration is declarative (`infrastructure/kong/kong.yml`) with:

- Service routing with path stripping
- JWT authentication for protected routes
- Rate limiting per service
- CORS configuration
- Prometheus metrics
- Health checks for all services

## Development Workflow

1. **Prerequisites**: Node.js 18+, npm 9+, Docker & Docker Compose
2. **Environment Variables**: Copy `.env.example` to `.env` in each service directory
3. **Database Migrations**: Run migrations before starting development
4. **Type Safety**: Always build types library first: `npm run build -- --filter=@openmaas/types`
5. **API Documentation**: Each service exposes Swagger docs at `http://localhost:[port]/api`
6. **Code Quality**: Husky pre-commit hooks run linting and formatting automatically

## Key Integration Points

- **GTFS Data**: Services should follow GTFS/GTFS-RT standards for transit data
- **Geospatial Operations**: Use PostGIS functions for location-based queries
- **Authentication**: All services validate JWT tokens against the shared secret
- **Service Communication**: Internal services communicate through Kong with service-to-service authentication
- **Payment Processing**: Stripe integration for payments, refunds, and payment method management
- **Webhook Handling**: Stripe webhooks are verified and processed asynchronously

## Git Workflow Instructions

This repository is hosted at: https://github.com/ukyonagata0105/OpenMaaS

When the user asks to push changes to git:

1. Always check if git is initialized first (`git status`)
2. If there's a nested git repository warning, remove the nested .git directory
3. Stage all changes with `git add .`
4. Create a meaningful commit message that describes what was implemented
5. If asked to push to origin main, execute `git push origin main`
6. The remote origin is already configured for this repository

## TypeScript Build Error Patterns

When fixing TypeScript strict mode errors in this codebase:

### Configuration Errors
For services with configuration files, fix parseInt/parseFloat with undefined by providing defaults:
```typescript
// Bad: parseInt(process.env.PORT) - can be undefined
// Good: parseInt(process.env.PORT || '3004', 10)
```

### DTO Property Initialization  
Use definite assignment assertions for DTO classes to satisfy strictPropertyInitialization:
```typescript
export class LocationDto {
  @IsNumber()
  lat!: number;  // Add "!" for definite assignment
}
```

### Interface Implementation in DTOs
Remove interface implementations from DTO classes to avoid strict type checking conflicts:
```typescript
// Bad: export class LocationDto implements Location
// Good: export class LocationDto (remove implements)
```

### AuthContext vs JwtPayload
- AuthContext has `userId: string` property
- JwtPayload has `sub: string` property  
- Services should use AuthContext.userId for user identification

### Keycloak API Updates
Recent Keycloak admin client uses:
- `scopes: ['openid']` (array) instead of `scope: 'openid'` (string)
- Always verify API method signatures match current @keycloak/keycloak-admin-client version

## Frontend Development

The project includes a Next.js 15.3.3 frontend application located in `apps/web/`.

### Frontend Commands
```bash
cd apps/web

# Development
npm run dev          # Start Next.js dev server on localhost:3000

# Production
npm run build        # Build for production
npm run start        # Start production server

# Quality
npm run lint         # Run ESLint
npm run test         # Run Jest tests
npm run test:watch   # Run tests in watch mode
```

### Frontend Architecture

**Technology Stack:**
- Next.js 15.3.3 with App Router
- React 19 with TypeScript 5
- Tailwind CSS 4 for styling
- shadcn/ui for component library
- Lucide React for icons
- TanStack Query for API state management
- Zustand for global state management
- NextAuth.js for authentication

**Key Features:**
- Progressive Web App (PWA) support with manifest.json
- Responsive design with mobile-first approach
- Japanese language UI with internationalization support
- Real-time dashboard with live updates
- Interactive transit status monitoring
- Multi-modal journey planning interface

**App Structure:**
```
apps/web/src/
├── app/                    # Next.js App Router pages
│   ├── dashboard/         # Main dashboard page
│   ├── routes/           # Route planning interface
│   ├── bookings/         # Booking management
│   ├── payments/         # Payment interface
│   ├── profile/          # User profile
│   ├── journey/          # Journey tracking
│   ├── tickets/          # Ticket management
│   └── admin/            # Admin interface
├── components/           # Reusable UI components
│   ├── ui/              # shadcn/ui base components
│   ├── layout/          # Layout components (header, etc.)
│   ├── journey/         # Journey-specific components
│   ├── tickets/         # Ticket components
│   ├── transit/         # Transit status components
│   └── pwa/             # PWA installer component
├── hooks/               # Custom React hooks
├── lib/                 # Utilities and configurations
└── providers/           # React context providers
```

### Design System

The frontend uses a modern design system with:
- Gradient backgrounds and subtle animations
- Color-coded cards for different data types (blue, green, emerald, yellow)
- Hover effects and smooth transitions
- Responsive grid layouts (1-col mobile, 2-col tablet, 4-col desktop)
- Japanese typography optimized for readability

### Next.js Specific Patterns

**Client Components:** Use `'use client'` directive for components requiring:
- useState, useEffect hooks
- useSearchParams (must be wrapped in Suspense boundary)
- Browser APIs and event handlers

**Suspense Boundaries:** Always wrap useSearchParams usage:
```typescript
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function ContentComponent() {
  const searchParams = useSearchParams();
  // Component logic
}

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ContentComponent />
    </Suspense>
  );
}
```

**Environment Issues:** Some development environments may have localhost connection restrictions. The Next.js server runs correctly but browser access may be blocked by network policies.

### Workspace Configuration
Workspaces are configured in root package.json:
```json
"workspaces": [
  "services/*",
  "libs/*", 
  "apps/*"
]
```

## Build Dependencies

The monorepo uses Turbo for build orchestration:

### Build Order
1. Shared libraries (`libs/types`, `libs/common`) build first
2. Backend services depend on shared libraries
3. Frontend can build independently but may consume backend APIs

### Turbo Pipeline
- `turbo run dev`: Starts all services in development mode
- `turbo run build`: Builds all packages with dependency resolution
- `turbo run test`: Runs tests across all packages
- `turbo run lint`: Lints all TypeScript/JavaScript code

## Current Build Status

- ✅ **Frontend (apps/web)**: Next.js app builds and runs successfully
- ✅ **Shared Libraries**: types, common packages build successfully  
- ✅ **Backend Services**: route-service, auth-service, user-service build successfully
- ⚠️ **Backend Services**: booking-service, payment-service, transit-service need TypeScript strict mode fixes

## Quick Start Commands

```bash
# Complete first-time setup (installs dependencies, starts all services)
./scripts/dev-setup.sh

# Alternative manual setup
npm install                     # Install all dependencies
npm run docker:up              # Start infrastructure
npm run build                  # Build all services
npm run dev                    # Start development mode
```

## Testing Commands

```bash
# Run all tests
npm run test

# Run tests for a specific service
cd services/[service-name]
npm run test

# Run a specific test file
npx jest src/__tests__/specific.test.ts

# Run tests in watch mode
npx jest --watch

# Run tests with coverage
npx jest --coverage
```

## Database Commands

```bash
# For services with TypeORM (user, transit, booking, payment)
cd services/[service-name]

# Generate new migration based on entity changes
npm run migration:generate -- -n MigrationName

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Show migration status
npm run migration:show
```

## Debug Commands

```bash
# View all running containers
docker ps

# View specific service logs
docker logs openmaas-[service-name]-1

# Access service container shell
docker exec -it openmaas-[service-name]-1 sh

# Check service health
curl http://localhost:[port]/health

# View API documentation
# Navigate to: http://localhost:[port]/api
```

## Common Development Patterns

### Adding a New Endpoint

1. Create DTO with validation:
```typescript
// dto/create-item.dto.ts
export class CreateItemDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsNumber()
  @Min(0)
  price!: number;
}
```

2. Add controller method:
```typescript
@Post()
@UseGuards(JwtAuthGuard)
async create(@Body() dto: CreateItemDto, @Req() req: AuthRequest) {
  return this.service.create(dto, req.user.userId);
}
```

3. Implement service logic with repository pattern

### Error Handling Pattern

```typescript
// Use HttpException for client errors
throw new BadRequestException('Invalid input');
throw new NotFoundException('Resource not found');
throw new UnauthorizedException('Invalid credentials');

// Global exception filter handles all errors consistently
```

### Environment Variables

Each service requires a `.env` file. Copy from `.env.example`:
```bash
cd services/[service-name]
cp .env.example .env
```

Key environment variables:
- `NODE_ENV`: development/production
- `PORT`: Service port
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Shared secret for service authentication
- `KEYCLOAK_*`: Keycloak configuration
- `STRIPE_*`: Payment service configuration

## Troubleshooting

### TypeScript Build Errors
- Ensure `npm run build -- --filter=@openmaas/types` runs first
- Check for missing `!` in DTO properties
- Verify environment variable parsing with defaults

### Docker Issues
- Run `docker system prune -a` if out of space
- Check `docker-compose.yml` for port conflicts
- Ensure Docker daemon is running

### Database Connection
- Verify PostgreSQL container is running: `docker ps`
- Check connection string in `.env`
- Ensure PostGIS extension is enabled

### Service Communication
- All services communicate through Kong (port 8000)
- Internal service URLs: `http://kong:8000/[service-path]`
- Add service token for service-to-service auth

## OpenMaaS開発方針

### ユーザー権限別機能
1. **一般利用者**
   - チケット購入・表示
   - QRコード表示（タップで表示）
   - 旅行履歴確認

2. **交通事業者**
   - 運行状況管理
   - 乗客データ分析
   - 収益レポート

3. **チケット提供者（旅行会社）**
   - チケット在庫管理
   - 価格設定
   - 販売レポート

### 重要機能
- **QRコード機能**: チケットタップでダミーQRコード表示
- **地図統合**: 目的地検索、ルート表示機能  
- **デザイン統一**: シンプルで一貫性のあるUI

### セキュリティ強化QRコード機能（2025年6月27日実装完了）
**ultrahink原則に基づく徹底実装:**

**実装済み機能:**
- ✅ 30秒ごと自動更新タイマー付きQRコード
- ✅ ユーザー名・タイムスタンプウォーターマーク
- ✅ スクリーンキャプチャ検知（macOS/Windows対応）
- ✅ 検知時のセキュリティオーバーレイ表示
- ✅ JSON構造化QRデータ（checksum付き）
- ✅ 強化されたセキュリティ警告UI

**技術仕様:**
```typescript
// セキュアQRデータ構造
{
  ticket: string,           // 元のチケットデータ
  timestamp: number,        // 生成時刻
  userId: string,          // ユーザー識別子
  validFor: 30,            // 有効期限（秒）
  checksum: string         // Base64エンコードされた検証値
}
```

**セキュリティ対策:**
1. **時間制限** - 30秒自動更新で古いQRコード無効化
2. **ウォーターマーク** - 半透明ユーザー情報表示で不正転載防止  
3. **キャプチャ検知** - Cmd+Shift+3/4、PrintScreen等検知
4. **表示制限** - 検知時の一時的QRコード隠蔽

**実装ファイル:**
- `/apps/web/src/components/tickets/digital-ticket.tsx` - QRセキュリティ機能本体
- `/apps/web/src/app/tickets/page.tsx` - チケット一覧・選択UI

### 開発手順
1. 作業内容は必ず`memorytodo.md`に記録
2. 作業前に計画を保存
3. 作業後に進捗を更新
4. Playwright MCPでUI確認を徹底

### Playwright MCP トラブルシューティング
**ブラウザインスタンスエラーの解決方法:**
```bash
# Playwrightがエラーになる場合は、まずChromeプロセスを終了
pkill -f chrome

# その後、Playwright MCPを使用
mcp__playwright__browser_navigate
```

**エラー例:**
- `Error: Browser is already in use for /Users/.../mcp-chrome-profile`
- 解決: `pkill -f chrome` を実行してから再試行

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
