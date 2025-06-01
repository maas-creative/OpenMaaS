export default () => ({
  port: parseInt(process.env.PORT || '3002', 10),
  corsOrigins: process.env.CORS_ORIGINS || 'http://localhost:3000',
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER || 'openmaas',
    password: process.env.DATABASE_PASSWORD || 'openmaas-dev',
    database: process.env.DATABASE_NAME || 'openmaas',
    synchronize: process.env.NODE_ENV === 'development',
    logging: process.env.NODE_ENV === 'development',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-jwt-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRATION || '7d',
  },
  keycloak: {
    baseUrl: process.env.KEYCLOAK_URL || 'http://localhost:8080',
    realm: process.env.KEYCLOAK_REALM || 'openmaas',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
});
