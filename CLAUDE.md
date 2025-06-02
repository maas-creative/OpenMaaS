# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.

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

## Current Build Status

As of the most recent session, these services build successfully:
- ✅ types, common, route-service, auth-service, user-service
- ❌ booking-service, payment-service, transit-service (need similar TypeScript fixes)
