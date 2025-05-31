export default () => ({
  app: {
    port: parseInt(process.env.PORT, 10) || 3006,
    env: process.env.NODE_ENV || 'development',
  },
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
    username: process.env.DATABASE_USER || 'openmaas',
    password: process.env.DATABASE_PASSWORD || 'openmaas-dev',
    database: process.env.DATABASE_NAME || 'openmaas',
    schema: process.env.DATABASE_SCHEMA || 'payment',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'openmaas-jwt-secret-2024',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || '',
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    apiVersion: process.env.STRIPE_API_VERSION || '2023-10-16',
  },
  payment: {
    currency: process.env.PAYMENT_CURRENCY || 'JPY',
    minAmount: parseInt(process.env.PAYMENT_MIN_AMOUNT, 10) || 100,
    maxAmount: parseInt(process.env.PAYMENT_MAX_AMOUNT, 10) || 10000000,
    refundWindowDays: parseInt(process.env.REFUND_WINDOW_DAYS, 10) || 30,
  },
  externalServices: {
    bookingServiceUrl: process.env.BOOKING_SERVICE_URL || 'http://localhost:3005',
    userServiceUrl: process.env.USER_SERVICE_URL || 'http://localhost:3002',
  },
  security: {
    encryptionKey: process.env.ENCRYPTION_KEY || 'default-32-character-encryption-key-change-me',
    webhookToleranceSeconds: parseInt(process.env.WEBHOOK_TOLERANCE_SECONDS, 10) || 300,
  },
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
  },
});