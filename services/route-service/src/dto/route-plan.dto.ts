import {
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  IsEnum,
  IsArray,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  RoutePlanRequest,
  RoutePlanResponse,
  Location,
  TransportMode,
  Itinerary,
  Leg,
  Place,
  Fare,
} from '@openmaas/types';

export class LocationDto implements Location {
  @ApiProperty({ description: 'Latitude in decimal degrees' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Transform(({ value }) => parseFloat(value))
  lat!: number;

  @ApiProperty({ description: 'Longitude in decimal degrees' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Transform(({ value }) => parseFloat(value))
  lon!: number;

  @ApiPropertyOptional({ description: 'Human-readable location name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Transit stop ID if applicable' })
  @IsOptional()
  @IsString()
  stopId?: string;
}

export class RoutePlanRequestDto implements Omit<RoutePlanRequest, 'from' | 'to'> {
  @ApiProperty({ type: LocationDto, description: 'Starting location' })
  @Type(() => LocationDto)
  from!: LocationDto;

  @ApiProperty({ type: LocationDto, description: 'Destination location' })
  @Type(() => LocationDto)
  to!: LocationDto;

  @ApiPropertyOptional({ description: 'Departure/arrival time in ISO format' })
  @IsOptional()
  @IsDateString()
  dateTime?: string;

  @ApiPropertyOptional({
    description: 'Whether dateTime is arrival time (true) or departure time (false)',
  })
  @IsOptional()
  @IsBoolean()
  arriveBy?: boolean;

  @ApiPropertyOptional({
    enum: TransportMode,
    isArray: true,
    description: 'Allowed transport modes',
  })
  @IsOptional()
  @IsArray()
  @IsEnum(TransportMode, { each: true })
  modes?: TransportMode[];

  @ApiPropertyOptional({ description: 'Maximum walking distance in meters' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50000)
  @Transform(({ value }) => parseInt(value))
  maxWalkDistance?: number;

  @ApiPropertyOptional({ description: 'Whether to consider wheelchair accessibility' })
  @IsOptional()
  @IsBoolean()
  wheelchairAccessible?: boolean;

  @ApiPropertyOptional({ description: 'Number of itineraries to return' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  @Transform(({ value }) => parseInt(value))
  numItineraries?: number;

  @ApiPropertyOptional({ description: 'Preferred route IDs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredRoutes?: string[];

  @ApiPropertyOptional({ description: 'Route IDs to avoid', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  avoidRoutes?: string[];
}

export class PlaceDto implements Place {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  lat!: number;

  @ApiProperty()
  lon!: number;

  @ApiPropertyOptional()
  stopId?: string;

  @ApiPropertyOptional()
  platformCode?: string;

  @ApiPropertyOptional()
  vertexType?: string;
}

export class FareDto implements Fare {
  @ApiProperty()
  type!: string;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  cents!: number;

  @ApiProperty()
  components!: Array<{
    fareId: string;
    currency: string;
    cents: number;
    routes: string[];
  }>;
}

export class LegDto implements Leg {
  @ApiProperty()
  startTime!: Date;

  @ApiProperty()
  endTime!: Date;

  @ApiProperty({ description: 'Duration in seconds' })
  duration!: number;

  @ApiProperty({ description: 'Distance in meters' })
  distance!: number;

  @ApiProperty({ enum: TransportMode })
  mode!: TransportMode;

  @ApiProperty({ type: PlaceDto })
  from!: PlaceDto;

  @ApiProperty({ type: PlaceDto })
  to!: PlaceDto;

  @ApiPropertyOptional()
  legGeometry?: GeoJSON.LineString;

  @ApiPropertyOptional()
  realTime?: boolean;

  @ApiPropertyOptional()
  pathway?: boolean;

  @ApiPropertyOptional()
  route?: Record<string, unknown>;

  @ApiPropertyOptional()
  trip?: Record<string, unknown>;

  @ApiPropertyOptional()
  intermediateStops?: Array<Record<string, unknown>>;

  @ApiPropertyOptional()
  alerts?: Array<Record<string, unknown>>;
}

export class ItineraryDto implements Itinerary {
  @ApiProperty()
  startTime!: Date;

  @ApiProperty()
  endTime!: Date;

  @ApiProperty({ description: 'Total duration in seconds' })
  duration!: number;

  @ApiProperty({ description: 'Number of transfers' })
  transfers!: number;

  @ApiProperty({ description: 'Total walking distance in meters' })
  walkDistance!: number;

  @ApiProperty({ description: 'Total walking time in seconds' })
  walkTime!: number;

  @ApiProperty({ description: 'Total waiting time in seconds' })
  waitingTime!: number;

  @ApiProperty({ type: [LegDto] })
  legs!: LegDto[];

  @ApiPropertyOptional({ type: FareDto })
  fare?: FareDto;
}

export class RoutePlanResponseDto implements RoutePlanResponse {
  @ApiProperty({ type: [ItineraryDto] })
  itineraries!: ItineraryDto[];

  @ApiProperty({ type: RoutePlanRequestDto })
  requestParameters!: RoutePlanRequestDto;

  @ApiPropertyOptional()
  debugOutput?: Record<string, unknown>;
}

export class GeocodingRequestDto {
  @ApiProperty({ description: 'Address or location name to geocode' })
  @IsString()
  query!: string;

  @ApiPropertyOptional({ description: 'Limit number of results' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  @Transform(({ value }) => parseInt(value))
  limit?: number;

  @ApiPropertyOptional({ description: 'Bias results near this latitude' })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  focusLat?: number;

  @ApiPropertyOptional({ description: 'Bias results near this longitude' })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  focusLon?: number;
}

export class GeocodingResponseDto {
  @ApiProperty()
  query!: string;

  @ApiProperty({ type: [LocationDto] })
  results!: LocationDto[];
}
