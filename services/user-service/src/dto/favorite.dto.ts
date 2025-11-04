import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, ValidateIf, IsObject } from 'class-validator';

export class CreateFavoriteDto {
  @ApiProperty({ example: '自宅', description: 'Name of the favorite' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'location', enum: ['location', 'route'] })
  @IsEnum(['location', 'route'])
  type!: 'location' | 'route';

  @ApiProperty({
    example: { lat: 35.6895, lon: 139.6917, address: '東京都渋谷区' },
    required: false,
    description: 'Location details (required if type is location)',
  })
  @ValidateIf((o) => o.type === 'location')
  @IsObject()
  location?: {
    lat: number;
    lon: number;
    address?: string;
  };

  @ApiProperty({
    example: {
      from: { lat: 35.6895, lon: 139.6917, address: '東京駅' },
      to: { lat: 34.6937, lon: 135.5023, address: '大阪駅' },
      routeId: 'route_123',
    },
    required: false,
    description: 'Route details (required if type is route)',
  })
  @ValidateIf((o) => o.type === 'route')
  @IsObject()
  route?: {
    from: { lat: number; lon: number; address?: string };
    to: { lat: number; lon: number; address?: string };
    routeId?: string;
  };
}

export class UpdateFavoriteDto {
  @ApiProperty({ example: '会社', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: { lat: 35.6895, lon: 139.6917, address: '東京都千代田区' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  location?: {
    lat: number;
    lon: number;
    address?: string;
  };

  @ApiProperty({
    example: {
      from: { lat: 35.6895, lon: 139.6917, address: '東京駅' },
      to: { lat: 34.6937, lon: 135.5023, address: '大阪駅' },
      routeId: 'route_123',
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  route?: {
    from: { lat: number; lon: number; address?: string };
    to: { lat: number; lon: number; address?: string };
    routeId?: string;
  };
}
