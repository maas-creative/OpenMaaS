export default () => ({
  app: {
    port: parseInt(process.env.PORT || '3005', 10),
    env: process.env.NODE_ENV || 'development',
  },
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER || 'openmaas',
    password: process.env.DATABASE_PASSWORD || 'openmaas-dev',
    database: process.env.DATABASE_NAME || 'openmaas',
    schema: process.env.DATABASE_SCHEMA || 'booking',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'openmaas-jwt-secret-2024',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
  },
  externalServices: {
    userServiceUrl: process.env.USER_SERVICE_URL || 'http://localhost:3002',
    routeServiceUrl: process.env.ROUTE_SERVICE_URL || 'http://localhost:3004',
    paymentServiceUrl: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3006',
  },
  booking: {
    expiryMinutes: parseInt(process.env.BOOKING_EXPIRY_MINUTES || '15', 10),
    maxBookingsPerUser: parseInt(process.env.MAX_BOOKINGS_PER_USER || '10', 10),
    advanceBookingDays: parseInt(process.env.ADVANCE_BOOKING_DAYS || '30', 10),
  },
  providers: {
    apiTimeout: parseInt(process.env.PROVIDER_API_TIMEOUT || '30000', 10),
  },
  notifications: {
    emailServiceUrl: process.env.EMAIL_SERVICE_URL || '',
    smsServiceUrl: process.env.SMS_SERVICE_URL || '',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
  },
});
