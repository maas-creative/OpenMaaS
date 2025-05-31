FROM node:18-alpine AS builder

# Install dependencies for building native modules
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy workspace files
COPY package.json turbo.json ./
COPY libs ./libs
COPY services/user-service ./services/user-service

# Install dependencies
RUN npm ci

# Build the application
RUN npm run build -- --filter=@openmaas/user-service...

# Production stage
FROM node:18-alpine

RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy built application
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/user-service/dist ./dist
COPY --from=builder /app/services/user-service/package.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3002

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]