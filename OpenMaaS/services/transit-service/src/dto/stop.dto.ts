import { IsString, IsOptional, IsNumber, IsEnum, IsUrl, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Stop, LocationType, WheelchairBoarding } from '@openmaas/types';

export class CreateStopDto implements Omit<Stop, 'stopId'> {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stopCode?: string;

  @ApiProperty()
  @IsString()
  stopName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stopDesc?: string;

  @ApiProperty()
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Transform(({ value }) => parseFloat(value))
  stopLat: number;

  @ApiProperty()
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Transform(({ value }) => parseFloat(value))
  stopLon: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  zoneId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  stopUrl?: string;

  @ApiPropertyOptional({ enum: LocationType })
  @IsOptional()
  @IsEnum(LocationType)
  locationType?: LocationType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentStation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stopTimezone?: string;

  @ApiPropertyOptional({ enum: WheelchairBoarding })
  @IsOptional()
  @IsEnum(WheelchairBoarding)
  wheelchairBoarding?: WheelchairBoarding;
}

export class StopSearchDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  lat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  lon?: number;

  @ApiPropertyOptional({ description: 'Radius in meters' })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  radius?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  limit?: number;
}

export class StopResponseDto implements Stop {
  @ApiProperty()
  stopId: string;

  @ApiPropertyOptional()
  stopCode?: string;

  @ApiProperty()
  stopName: string;

  @ApiPropertyOptional()
  stopDesc?: string;

  @ApiProperty()
  stopLat: number;

  @ApiProperty()
  stopLon: number;

  @ApiPropertyOptional()
  zoneId?: string;

  @ApiPropertyOptional()
  stopUrl?: string;

  @ApiPropertyOptional({ enum: LocationType })
  locationType?: LocationType;

  @ApiPropertyOptional()
  parentStation?: string;

  @ApiPropertyOptional()
  stopTimezone?: string;

  @ApiPropertyOptional({ enum: WheelchairBoarding })
  wheelchairBoarding?: WheelchairBoarding;
}