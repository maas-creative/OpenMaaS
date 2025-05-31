#!/bin/bash

set -e

echo "🚀 OpenMaaS Development Environment Setup"
echo "========================================"

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed. Aborting." >&2; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "❌ Docker Compose is required but not installed. Aborting." >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed. Aborting." >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required but not installed. Aborting." >&2; exit 1; }

# Check Node.js version
NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please update .env file with your configuration"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build TypeScript types
echo "🔨 Building TypeScript types..."
npm run build -- --filter=@openmaas/types

# Start Docker services
echo "🐳 Starting Docker services..."
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."

# Wait for PostgreSQL
until docker-compose exec -T postgres pg_isready -U openmaas >/dev/null 2>&1; do
    echo "   Waiting for PostgreSQL..."
    sleep 2
done
echo "✅ PostgreSQL is ready"

# Wait for Redis
until docker-compose exec -T redis redis-cli ping >/dev/null 2>&1; do
    echo "   Waiting for Redis..."
    sleep 2
done
echo "✅ Redis is ready"

# Wait for Keycloak
until curl -sf http://localhost:8080/health/ready >/dev/null 2>&1; do
    echo "   Waiting for Keycloak..."
    sleep 5
done
echo "✅ Keycloak is ready"

# Wait for Kong
until curl -sf http://localhost:8001/status >/dev/null 2>&1; do
    echo "   Waiting for Kong..."
    sleep 5
done
echo "✅ Kong is ready"

# Setup Kong
echo "🔧 Configuring Kong API Gateway..."
./scripts/setup-kong.sh

# Create OTP data directory
echo "📁 Creating OpenTripPlanner data directory..."
mkdir -p data/otp/graphs

echo ""
echo "✨ Development environment is ready!"
echo ""
echo "📚 Service URLs:"
echo "   - Kong Gateway:    http://localhost:8000"
echo "   - Kong Admin:      http://localhost:8001"
echo "   - Keycloak:        http://localhost:8080"
echo "   - PostgreSQL:      localhost:5432"
echo "   - Redis:           localhost:6379"
echo "   - OTP:             http://localhost:8090"
echo "   - Adminer:         http://localhost:8082"
echo ""
echo "🔑 Default credentials:"
echo "   - Keycloak Admin:  admin / admin"
echo "   - PostgreSQL:      openmaas / openmaas-dev"
echo ""
echo "📝 Next steps:"
echo "   1. Update .env file with your configuration"
echo "   2. Run 'npm run dev' to start development servers"
echo "   3. Visit http://localhost:3000 for the web app"
echo ""
echo "💡 Useful commands:"
echo "   - npm run dev          # Start all services in development mode"
echo "   - npm run test         # Run tests"
echo "   - npm run lint         # Run linter"
echo "   - docker-compose logs  # View Docker logs"
echo "   - docker-compose down  # Stop all services"