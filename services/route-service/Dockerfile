FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY turbo.json ./
COPY tsconfig.base.json ./

# Copy workspace packages
COPY libs ./libs
COPY services/route-service ./services/route-service

# Install dependencies
RUN npm ci

# Build the application
RUN npm run build -- --filter=@openmaas/route-service

# Production image
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY turbo.json ./

# Copy built application
COPY --from=builder /app/libs ./libs
COPY --from=builder /app/services/route-service ./services/route-service

# Install production dependencies only
RUN npm ci --production

EXPOSE 3004

CMD ["node", "services/route-service/dist/index.js"]