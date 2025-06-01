import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { TransitService } from '../services/transit.service';
import { AgencyResponseDto } from '../dto/agency.dto';
import { StopResponseDto, StopSearchDto } from '../dto/stop.dto';
import { RouteResponseDto, RouteSearchDto } from '../dto/route.dto';

@ApiTags('transit')
@Controller('transit')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TransitController {
  constructor(private readonly transitService: TransitService) {}

  // Agency endpoints
  @Get('agencies')
  @ApiOperation({ summary: 'Get all transit agencies' })
  @ApiResponse({
    status: 200,
    description: 'List of transit agencies',
    type: [AgencyResponseDto],
  })
  async getAgencies(): Promise<AgencyResponseDto[]> {
    return this.transitService.getAgencies();
  }

  @Get('agencies/:agencyId')
  @ApiOperation({ summary: 'Get a specific transit agency' })
  @ApiResponse({
    status: 200,
    description: 'Transit agency details',
    type: AgencyResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Agency not found' })
  async getAgency(@Param('agencyId') agencyId: string): Promise<AgencyResponseDto> {
    return this.transitService.getAgency(agencyId);
  }

  @Get('agencies/:agencyId/routes')
  @ApiOperation({ summary: 'Get routes for a specific agency' })
  @ApiResponse({
    status: 200,
    description: 'List of routes for the agency',
    type: [RouteResponseDto],
  })
  async getAgencyRoutes(@Param('agencyId') agencyId: string): Promise<RouteResponseDto[]> {
    return this.transitService.getRoutesByAgency(agencyId);
  }

  // Stop endpoints
  @Get('stops')
  @ApiOperation({ summary: 'Search for transit stops' })
  @ApiResponse({
    status: 200,
    description: 'List of transit stops',
    type: [StopResponseDto],
  })
  async getStops(@Query() query: StopSearchDto): Promise<StopResponseDto[]> {
    return this.transitService.getStops(query);
  }

  @Get('stops/:stopId')
  @ApiOperation({ summary: 'Get a specific transit stop' })
  @ApiResponse({
    status: 200,
    description: 'Transit stop details',
    type: StopResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Stop not found' })
  async getStop(@Param('stopId') stopId: string): Promise<StopResponseDto> {
    return this.transitService.getStop(stopId);
  }

  @Post('stops/batch')
  @ApiOperation({ summary: 'Get multiple stops by IDs' })
  @ApiResponse({
    status: 200,
    description: 'List of requested stops',
    type: [StopResponseDto],
  })
  async getStopsByIds(@Body() stopIds: string[]): Promise<StopResponseDto[]> {
    return this.transitService.getStopsByIds(stopIds);
  }

  // Route endpoints
  @Get('routes')
  @ApiOperation({ summary: 'Search for transit routes' })
  @ApiResponse({
    status: 200,
    description: 'List of transit routes',
    type: [RouteResponseDto],
  })
  async getRoutes(@Query() query: RouteSearchDto): Promise<RouteResponseDto[]> {
    return this.transitService.getRoutes(query);
  }

  @Get('routes/:routeId')
  @ApiOperation({ summary: 'Get a specific transit route' })
  @ApiResponse({
    status: 200,
    description: 'Transit route details',
    type: RouteResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Route not found' })
  async getRoute(@Param('routeId') routeId: string): Promise<RouteResponseDto> {
    return this.transitService.getRoute(routeId);
  }
}
