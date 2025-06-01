import { IsString, IsOptional, IsUrl, IsBoolean, IsNumber, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFeedDto {
  @ApiProperty()
  @IsString()
  feedId: string;

  @ApiProperty()
  @IsString()
  providerId: string;

  @ApiProperty()
  @IsString()
  providerName: string;

  @ApiProperty()
  @IsUrl()
  feedUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feedType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Update frequency in seconds' })
  @IsOptional()
  @IsNumber()
  @Min(3600) // minimum 1 hour
  @Transform(({ value }) => parseInt(value))
  updateFrequency?: number;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateFeedDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  providerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  feedUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(3600)
  updateFrequency?: number;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class FeedResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  feedId: string;

  @ApiProperty()
  providerId: string;

  @ApiProperty()
  providerName: string;

  @ApiProperty()
  feedUrl: string;

  @ApiProperty()
  feedType: string;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  lastUpdated?: Date;

  @ApiPropertyOptional()
  lastFetchAttempt?: Date;

  @ApiPropertyOptional()
  lastFetchError?: string;

  @ApiProperty()
  updateFrequency: number;

  @ApiPropertyOptional()
  metadata?: Record<string, any>;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
