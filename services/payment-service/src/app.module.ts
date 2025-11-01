import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { LoggerModule, RequestIdMiddleware } from '@openmaas/common';

import configuration from './config/configuration';
import { getDatabaseConfig } from './config/database.config';
import { PaymentController } from './controllers/payment.controller';
import { WebhookController } from './controllers/webhook.controller';
import { PaymentService } from './services/payment.service';
import { PaymentMethodService } from './services/payment-method.service';
import { ReceiptService } from './services/receipt.service';
import { StripeService } from './services/stripe.service';
import { PaymentEntity } from './entities/payment.entity';
import { PaymentMethodEntity } from './entities/payment-method.entity';
import { RefundEntity } from './entities/refund.entity';
import { PaymentRepository } from './repositories/payment.repository';
import { PaymentMethodRepository } from './repositories/payment-method.repository';
import { RefundRepository } from './repositories/refund.repository';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: getDatabaseConfig,
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([PaymentEntity, PaymentMethodEntity, RefundEntity]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('jwt.secret'),
        signOptions: { expiresIn: config.get('jwt.expiresIn') },
      }),
    }),
    LoggerModule,
  ],
  controllers: [PaymentController, WebhookController],
  providers: [
    PaymentService,
    PaymentMethodService,
    ReceiptService,
    StripeService,
    PaymentRepository,
    PaymentMethodRepository,
    RefundRepository,
    JwtStrategy,
  ],
  exports: [PaymentService, PaymentMethodService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestIdMiddleware)
      .exclude('webhooks/(.*)') // Exclude webhooks from request ID middleware
      .forRoutes('*');
  }
}
