import { IsString, IsOptional, IsEnum, IsNumber, IsHexColor, IsUrl } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Route, RouteType } from '@openmaas/types';

export class CreateRouteDto implements Omit<Route, 'routeId'> {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agencyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  routeShortName?: string;

  @ApiProperty()
  @IsString()
  routeLongName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  routeDesc?: string;

  @ApiProperty({ enum: RouteType })
  @IsEnum(RouteType)
  routeType: RouteType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  routeUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsHexColor()
  routeColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsHexColor()
  routeTextColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  routeSortOrder?: number;
}

export class RouteSearchDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agencyId?: string;

  @ApiPropertyOptional({ enum: RouteType })
  @IsOptional()
  @IsEnum(RouteType)
  routeType?: RouteType;

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

export class RouteResponseDto implements Route {
  @ApiProperty()
  routeId: string;

  @ApiPropertyOptional()
  agencyId?: string;

  @ApiPropertyOptional()
  routeShortName?: string;

  @ApiProperty()
  routeLongName: string;

  @ApiPropertyOptional()
  routeDesc?: string;

  @ApiProperty({ enum: RouteType })
  routeType: RouteType;

  @ApiPropertyOptional()
  routeUrl?: string;

  @ApiPropertyOptional()
  routeColor?: string;

  @ApiPropertyOptional()
  routeTextColor?: string;

  @ApiPropertyOptional()
  routeSortOrder?: number;
}