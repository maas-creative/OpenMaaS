import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsArray,
  IsEnum,
  ValidateNested,
  IsObject,
  Min,
  Max,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TripLeg } from '../entities/trip-history.entity';

class LocationDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lon: number;
}

class TripLegDto implements TripLeg {
  @ApiProperty()
  @IsString()
  mode: string;

  @ApiProperty({ type: LocationDto })
  @ValidateNested()
  @Type(() => LocationDto)
  from: LocationDto;

  @ApiProperty({ type: LocationDto })
  @ValidateNested()
  @Type(() => LocationDto)
  to: LocationDto;

  @ApiProperty()
  @IsDateString()
  startTime: Date;

  @ApiProperty()
  @IsDateString()
  endTime: Date;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  duration: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  distance: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  routeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tripId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agencyId?: string;
}

class FareDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty()
  @IsString()
  currency: string;
}

export class CreateTripHistoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bookingId?: string;

  @ApiProperty()
  @IsDateString()
  startTime: Date;

  @ApiProperty()
  @IsDateString()
  endTime: Date;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  duration: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  totalDistance: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  walkDistance: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  transfers: number;

  @ApiProperty({ type: [TripLegDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TripLegDto)
  @ArrayMinSize(1)
  legs: TripLeg[];

  @ApiPropertyOptional({ type: FareDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FareDto)
  fare?: FareDto;

  @ApiPropertyOptional({
    enum: ['planned', 'completed', 'cancelled', 'modified'],
    default: 'planned',
  })
  @IsOptional()
  @IsEnum(['planned', 'completed', 'cancelled', 'modified'])
  status?: 'planned' | 'completed' | 'cancelled' | 'modified';

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateTripFeedbackDto {
  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  issues?: string[];
}

export class TripHistoryQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: Date;

  @ApiPropertyOptional({ enum: ['planned', 'completed', 'cancelled', 'modified'] })
  @IsOptional()
  @IsEnum(['planned', 'completed', 'cancelled', 'modified'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mode?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ default: 'startTime' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}

export class TripStatsQueryDto {
  @ApiProperty()
  @IsDateString()
  startDate: Date;

  @ApiProperty()
  @IsDateString()
  endDate: Date;
}

export class MonthlyStatsQueryDto {
  @ApiProperty({ minimum: 2020, maximum: 2100 })
  @IsNumber()
  @Min(2020)
  @Max(2100)
  year: number;

  @ApiProperty({ minimum: 1, maximum: 12 })
  @IsNumber()
  @Min(1)
  @Max(12)
  month: number;
}