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
  LoggerService,
} from '@openmaas/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Required for Stripe webhook signature verification
  });

  const configService = app.get(ConfigService);
  const port = configService.get('app.port') || 3006;

  // Configure raw body for webhook routes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global filters
  const logger = new LoggerService('PaymentService');
  app.useGlobalFilters(new AllExceptionsFilter(logger), new HttpExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(
    new LoggingInterceptor(logger),
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
  app.getHttpAdapter().get('/health', (_req, res) => {
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
