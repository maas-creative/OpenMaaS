export default () => ({
  port: parseInt(process.env.PORT || '3001', 10),
  corsOrigins: process.env.CORS_ORIGINS || 'http://localhost:3000',
  keycloak: {
    baseUrl: process.env.KEYCLOAK_URL || 'http://localhost:8080',
    realm: process.env.KEYCLOAK_REALM || 'openmaas',
    clientId: process.env.KEYCLOAK_CLIENT_ID || 'openmaas-backend',
    clientSecret: process.env.KEYCLOAK_CLIENT_SECRET || '',
    adminUsername: process.env.KEYCLOAK_ADMIN_USERNAME || 'admin',
    adminPassword: process.env.KEYCLOAK_ADMIN_PASSWORD || 'admin',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-jwt-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRATION || '7d',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
});