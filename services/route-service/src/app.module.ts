import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import configuration from './config/configuration';

// Services
import { RouteService } from './services/route.service';
import { OtpService } from './services/otp.service';
import { CacheService } from './services/cache.service';

// Controllers
import { RouteController } from './controllers/route.controller';

// Strategies
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
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
  controllers: [RouteController],
  providers: [
    // Services
    RouteService,
    OtpService,
    CacheService,
    // Strategies
    JwtStrategy,
  ],
})
export class AppModule {}