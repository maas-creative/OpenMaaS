import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RouteService } from '../services/route.service';
import {
  RoutePlanRequestDto,
  RoutePlanResponseDto,
  GeocodingRequestDto,
  GeocodingResponseDto,
} from '../dto/route-plan.dto';

@ApiTags('route-planning')
@Controller('routes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RouteController {
  constructor(private readonly routeService: RouteService) {}

  @Post('plan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Plan a route between two locations' })
  @ApiResponse({
    status: 200,
    description: 'Route planning successful',
    type: RoutePlanResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request parameters' })
  @ApiResponse({ status: 503, description: 'Route planning service unavailable' })
  async planRoute(@Body() request: RoutePlanRequestDto): Promise<RoutePlanResponseDto> {
    return this.routeService.planRoute(request);
  }

  @Get('geocode')
  @ApiOperation({ summary: 'Geocode an address or location name' })
  @ApiQuery({ name: 'query', description: 'Address or location name to geocode' })
  @ApiQuery({ name: 'limit', description: 'Maximum number of results', required: false })
  @ApiQuery({ name: 'focusLat', description: 'Latitude to bias results near', required: false })
  @ApiQuery({ name: 'focusLon', description: 'Longitude to bias results near', required: false })
  @ApiResponse({
    status: 200,
    description: 'Geocoding successful',
    type: GeocodingResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  @ApiResponse({ status: 503, description: 'Geocoding service unavailable' })
  async geocode(@Query() request: GeocodingRequestDto): Promise<GeocodingResponseDto> {
    return this.routeService.geocode(request);
  }

  @Get('reverse-geocode')
  @ApiOperation({ summary: 'Reverse geocode coordinates to get location information' })
  @ApiQuery({ name: 'lat', description: 'Latitude in decimal degrees' })
  @ApiQuery({ name: 'lon', description: 'Longitude in decimal degrees' })
  @ApiResponse({
    status: 200,
    description: 'Reverse geocoding successful',
    type: GeocodingResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid coordinates' })
  @ApiResponse({ status: 503, description: 'Geocoding service unavailable' })
  async reverseGeocode(
    @Query('lat') lat: number,
    @Query('lon') lon: number,
  ): Promise<GeocodingResponseDto> {
    return this.routeService.reverseGeocode(lat, lon);
  }

  @Get('health')
  @ApiOperation({ summary: 'Get route service health and metrics' })
  @ApiResponse({ status: 200, description: 'Service health information' })
  async getHealth(): Promise<Record<string, unknown>> {
    return this.routeService.getRouteMetrics();
  }
}
