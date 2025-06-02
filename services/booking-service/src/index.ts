import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { LoggerService } from '@openmaas/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new LoggerService('BookingService'),
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port');

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
    .setTitle('Booking Service API')
    .setDescription('OpenMaaS Booking Service - Reservation and booking management')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('bookings', 'Booking and reservation operations')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(port || 3005);

  const logger = new LoggerService('Bootstrap');
  logger.log(`Booking Service is running on port ${port}`);
  logger.log(`API documentation available at http://localhost:${port}/api`);
}

bootstrap();
