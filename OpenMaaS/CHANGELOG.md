# Changelog

All notable changes to OpenMaaS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial release of OpenMaaS platform
- Microservices architecture with 6 core services:
  - Auth Service: JWT authentication with Keycloak integration
  - User Service: User profile and trip history management
  - Transit Service: GTFS data processing and transit information
  - Route Service: Multi-modal route planning with OpenTripPlanner
  - Booking Service: Unified booking interface for transportation providers
  - Payment Service: Stripe payment processing with refund support
- Kong API Gateway for request routing and authentication
- PostgreSQL with PostGIS for geospatial data storage
- Redis for caching and session management
- Docker Compose setup for local development
- Kubernetes manifests for production deployment
- TypeScript strict mode across all services
- Comprehensive test coverage
- API documentation with Swagger/OpenAPI
- Multi-language support (English and Japanese)
- Security features:
  - JWT token-based authentication
  - Role-based access control (RBAC)
  - API rate limiting
  - Input validation and sanitization
  - SQL injection protection

### Infrastructure
- Automated development setup script
- GitHub Actions CI/CD pipeline
- Environment variable templates for all services
- Database migration system with TypeORM
- Health check endpoints for all services

### Documentation
- Comprehensive README in English and Japanese
- Contributing guidelines
- Security policy
- MIT License

### Developer Experience
- Turbo monorepo configuration
- Shared TypeScript types library
- Common utilities and middleware
- Consistent error handling across services
- Request/response logging and tracing
- Hot reload development mode

## [1.0.0] - TBD

First stable release. See Unreleased section for complete feature list.

---

Developed by [MaaS Creative Co. Ltd](https://maas-creative.com)