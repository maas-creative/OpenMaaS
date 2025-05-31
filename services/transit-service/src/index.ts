import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { LoggerService } from '@openmaas/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new LoggerService('TransitService'),
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
    .setTitle('Transit Service API')
    .setDescription('OpenMaaS Transit Service - GTFS data management')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('transit', 'Transit data operations')
    .addTag('transit-feeds', 'GTFS feed management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(port);
  
  const logger = new LoggerService('Bootstrap');
  logger.log(`Transit Service is running on port ${port}`);
  logger.log(`API documentation available at http://localhost:${port}/api`);
}

bootstrap();