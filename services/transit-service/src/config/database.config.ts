import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get('database.host'),
  port: configService.get('database.port'),
  username: configService.get('database.username'),
  password: configService.get('database.password'),
  database: configService.get('database.database'),
  schema: configService.get('database.schema'),
  entities: [__dirname + '/../entities/*.entity{.ts,.js}'],
  synchronize: configService.get('app.env') === 'development',
  logging: configService.get('app.env') === 'development',
});
