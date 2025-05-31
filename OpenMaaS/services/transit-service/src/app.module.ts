import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import configuration from './config/configuration';
import { getDatabaseConfig } from './config/database.config';

// Entities
import { AgencyEntity } from './entities/agency.entity';
import { StopEntity } from './entities/stop.entity';
import { RouteEntity } from './entities/route.entity';
import { TripEntity } from './entities/trip.entity';
import { StopTimeEntity } from './entities/stop-time.entity';
import { ShapeEntity } from './entities/shape.entity';
import { CalendarEntity } from './entities/calendar.entity';
import { FeedEntity } from './entities/feed.entity';

// Repositories
import { AgencyRepository } from './repositories/agency.repository';
import { StopRepository } from './repositories/stop.repository';
import { RouteRepository } from './repositories/route.repository';
import { FeedRepository } from './repositories/feed.repository';

// Services
import { TransitService } from './services/transit.service';
import { FeedService } from './services/feed.service';
import { GtfsService } from './services/gtfs.service';

// Controllers
import { TransitController } from './controllers/transit.controller';
import { FeedController } from './controllers/feed.controller';

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
    TypeOrmModule.forFeature([
      AgencyEntity,
      StopEntity,
      RouteEntity,
      TripEntity,
      StopTimeEntity,
      ShapeEntity,
      CalendarEntity,
      FeedEntity,
    ]),
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
  controllers: [TransitController, FeedController],
  providers: [
    // Repositories
    AgencyRepository,
    StopRepository,
    RouteRepository,
    FeedRepository,
    // Services
    TransitService,
    FeedService,
    GtfsService,
    // Strategies
    JwtStrategy,
  ],
})
export class AppModule {}