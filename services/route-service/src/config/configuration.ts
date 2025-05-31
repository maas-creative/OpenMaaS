export default () => ({
  app: {
    port: parseInt(process.env.PORT, 10) || 3004,
    env: process.env.NODE_ENV || 'development',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'openmaas-jwt-secret-2024',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || '',
  },
  otp: {
    url: process.env.OTP_URL || 'http://localhost:8090/otp/routers/default',
    timeout: parseInt(process.env.OTP_TIMEOUT, 10) || 30000,
  },
  transitService: {
    url: process.env.TRANSIT_SERVICE_URL || 'http://localhost:3003',
  },
  externalApis: {
    weatherApiKey: process.env.WEATHER_API_KEY || '',
    trafficApiKey: process.env.TRAFFIC_API_KEY || '',
  },
  routePlanning: {
    defaultWalkSpeed: parseFloat(process.env.DEFAULT_WALK_SPEED) || 1.4,
    defaultBikeSpeed: parseFloat(process.env.DEFAULT_BIKE_SPEED) || 5.0,
    maxWalkDistance: parseInt(process.env.MAX_WALK_DISTANCE, 10) || 2000,
    maxBikeDistance: parseInt(process.env.MAX_BIKE_DISTANCE, 10) || 20000,
    defaultNumItineraries: parseInt(process.env.DEFAULT_NUM_ITINERARIES, 10) || 3,
  },
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
  },
});