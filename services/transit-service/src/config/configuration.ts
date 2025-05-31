export default () => ({
  app: {
    port: parseInt(process.env.PORT, 10) || 3003,
    env: process.env.NODE_ENV || 'development',
  },
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
    username: process.env.DATABASE_USER || 'openmaas',
    password: process.env.DATABASE_PASSWORD || 'openmaas-dev',
    database: process.env.DATABASE_NAME || 'openmaas',
    schema: process.env.DATABASE_SCHEMA || 'transit',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'openmaas-jwt-secret-2024',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || '',
  },
  gtfs: {
    updateInterval: parseInt(process.env.GTFS_UPDATE_INTERVAL, 10) || 3600000,
    storagePath: process.env.GTFS_STORAGE_PATH || '/tmp/gtfs-data',
    maxFileSize: parseInt(process.env.MAX_GTFS_FILE_SIZE, 10) || 104857600,
  },
  otp: {
    url: process.env.OTP_URL || 'http://localhost:8090/otp/routers/default',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
  },
});