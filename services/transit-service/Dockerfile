FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY turbo.json ./
COPY tsconfig.base.json ./

# Copy workspace packages
COPY libs ./libs
COPY services/transit-service ./services/transit-service

# Install dependencies
RUN npm ci

# Build the application
RUN npm run build -- --filter=@openmaas/transit-service

# Production image
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY turbo.json ./

# Copy built application
COPY --from=builder /app/libs ./libs
COPY --from=builder /app/services/transit-service ./services/transit-service

# Install production dependencies only
RUN npm ci --production

EXPOSE 3003

CMD ["node", "services/transit-service/dist/index.js"]