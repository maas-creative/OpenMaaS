import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { LoggerService } from '@openmaas/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new LoggerService('RouteService'),
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') || 3004;

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Enable CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Route Service API')
    .setDescription('OpenMaaS Route Service - Multi-modal route planning with OpenTripPlanner')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('route-planning', 'Route planning and geocoding operations')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(port);

  const logger = new LoggerService('Bootstrap');
  logger.log(`Route Service is running on port ${port}`);
  logger.log(`API documentation available at http://localhost:${port}/api`);
  logger.log(`OpenTripPlanner URL: ${configService.get('otp.url')}`);
}

bootstrap();
