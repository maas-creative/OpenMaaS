import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UserController } from './controllers/user.controller';
import { UserService } from './services/user.service';
import { TripHistoryService } from './services/trip-history.service';
import { UserPreferencesService } from './services/user-preferences.service';
import { UserRepository } from './repositories/user.repository';
import { TripHistoryRepository } from './repositories/trip-history.repository';
import { User } from './entities/user.entity';
import { TripHistory } from './entities/trip-history.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import configuration from './config/configuration';
import { getDatabaseConfig } from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getDatabaseConfig,
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([User, TripHistory]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.expiresIn'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [UserController],
  providers: [
    UserService,
    TripHistoryService,
    UserPreferencesService,
    UserRepository,
    TripHistoryRepository,
    JwtStrategy,
  ],
  exports: [UserService],
})
export class AppModule {}
