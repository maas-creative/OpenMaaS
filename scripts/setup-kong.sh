#!/bin/bash

# Kong Admin API URL
KONG_ADMIN_URL=${KONG_ADMIN_URL:-"http://localhost:8001"}

echo "Setting up Kong API Gateway..."

# Wait for Kong to be ready
echo "Waiting for Kong to be ready..."
until curl -s ${KONG_ADMIN_URL}/status > /dev/null; do
  echo "Kong is not ready yet. Waiting..."
  sleep 5
done

echo "Kong is ready!"

# Apply declarative configuration
echo "Applying Kong configuration..."
curl -X POST ${KONG_ADMIN_URL}/config \
  -F config=@infrastructure/kong/kong.yml

echo "Kong configuration applied successfully!"

# Create JWT secrets for services
echo "Creating JWT secrets..."

# Get JWT plugin ID
JWT_PLUGIN_ID=$(curl -s ${KONG_ADMIN_URL}/plugins | jq -r '.data[] | select(.name == "jwt") | .id' | head -1)

if [ ! -z "$JWT_PLUGIN_ID" ]; then
  # Create a consumer for internal service communication
  curl -X POST ${KONG_ADMIN_URL}/consumers \
    -H "Content-Type: application/json" \
    -d '{"username": "openmaas-internal"}'

  # Create JWT credentials
  curl -X POST ${KONG_ADMIN_URL}/consumers/openmaas-internal/jwt \
    -H "Content-Type: application/json" \
    -d '{"key": "openmaas-internal-key", "secret": "'${JWT_SECRET:-"your-jwt-secret-change-in-production"}'"}'
fi

echo "Kong setup complete!"