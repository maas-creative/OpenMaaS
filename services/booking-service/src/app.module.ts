import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import configuration from './config/configuration';
import { getDatabaseConfig } from './config/database.config';

// Entities
import { BookingEntity } from './entities/booking.entity';
import { BookingProviderEntity } from './entities/booking-provider.entity';

// Repositories
import { BookingRepository } from './repositories/booking.repository';
import { BookingProviderRepository } from './repositories/booking-provider.repository';

// Services
import { BookingService } from './services/booking.service';
import { ProviderService } from './services/provider.service';
import { NotificationService } from './services/notification.service';
import { BookingSchedulerService } from './services/booking-scheduler.service';
import { QrCodeService } from './services/qr-code.service';

// Controllers
import { BookingController } from './controllers/booking.controller';
import { QrCodeController } from './controllers/qr-code.controller';

// Strategies
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getDatabaseConfig,
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([BookingEntity, BookingProviderEntity]),
    ScheduleModule.forRoot(),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('jwt.secret'),
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [BookingController, QrCodeController],
  providers: [
    // Repositories
    BookingRepository,
    BookingProviderRepository,
    // Services
    BookingService,
    ProviderService,
    NotificationService,
    BookingSchedulerService,
    QrCodeService,
    // Strategies
    JwtStrategy,
  ],
})
export class AppModule {}
