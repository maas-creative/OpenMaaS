import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';
import { User } from '../entities/user.entity';
import { TripHistory } from '../entities/trip-history.entity';

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get<string>('database.host'),
  port: configService.get<number>('database.port'),
  username: configService.get<string>('database.username'),
  password: configService.get<string>('database.password'),
  database: configService.get<string>('database.database'),
  schema: 'users',
  entities: [User, TripHistory],
  synchronize: configService.get<boolean>('database.synchronize'),
  logging: configService.get<boolean>('database.logging'),
  migrations: ['dist/migrations/*.js'],
  migrationsTableName: 'user_migrations',
});

// For TypeORM CLI
const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || 'openmaas',
  password: process.env.DATABASE_PASSWORD || 'openmaas-dev',
  database: process.env.DATABASE_NAME || 'openmaas',
  schema: 'users',
  entities: ['src/entities/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  migrationsTableName: 'user_migrations',
};

export default new DataSource(dataSourceOptions);