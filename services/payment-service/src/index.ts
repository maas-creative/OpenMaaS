import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import {
  AllExceptionsFilter,
  HttpExceptionFilter,
  LoggingInterceptor,
  TimeoutInterceptor,
  TransformInterceptor,
} from '@openmaas/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Required for Stripe webhook signature verification
  });

  const configService = app.get(ConfigService);
  const port = configService.get('port');

  // Configure raw body for webhook routes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global filters
  app.useGlobalFilters(new AllExceptionsFilter(), new HttpExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TimeoutInterceptor(),
    new TransformInterceptor(),
  );

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Payment Service')
    .setDescription('OpenMaaS Payment Service API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('payments', 'Payment operations')
    .addTag('webhooks', 'Webhook endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Health check endpoint
  app.getHttpAdapter().get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'payment-service',
      timestamp: new Date().toISOString(),
    });
  });

  await app.listen(port);
  console.log(`Payment service is running on port ${port}`);
}

bootstrap();
