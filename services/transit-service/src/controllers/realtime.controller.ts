import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { GtfsRealtimeService } from '../services/gtfs-realtime.service';

class TripUpdateDto {
  tripId!: string;
  routeId!: string;
  startTime?: string;
  startDate?: string;
  delay?: number;
  stopTimeUpdates!: StopTimeUpdateDto[];
}

class StopTimeUpdateDto {
  stopSequence?: number;
  stopId?: string;
  arrival?: TimeEventDto;
  departure?: TimeEventDto;
  scheduleRelationship?: number;
}

class TimeEventDto {
  time?: number;
  delay?: number;
  uncertainty?: number;
}

class VehiclePositionDto {
  tripId?: string;
  routeId?: string;
  vehicleId!: string;
  position!: {
    latitude: number;
    longitude: number;
    bearing?: number;
    speed?: number;
  };
  currentStopSequence?: number;
  currentStatus?: number;
  timestamp?: number;
  congestionLevel?: number;
  occupancyStatus?: number;
}

class AlertDto {
  alertId!: string;
  activePeriods!: {
    start?: number;
    end?: number;
  }[];
  informedEntities!: {
    agencyId?: string;
    routeId?: string;
    routeType?: number;
    trip?: {
      tripId: string;
      routeId?: string;
    };
    stopId?: string;
  }[];
  cause?: number;
  effect?: number;
  url?: string;
  headerText!: string;
  descriptionText!: string;
}

class StopPredictionDto {
  stopId!: string;
  stopName?: string;
  predictions!: {
    routeId: string;
    routeName?: string;
    tripId: string;
    headsign?: string;
    arrivalTime?: number;
    departureTime?: number;
    delay?: number;
    realtimeStatus: 'SCHEDULED' | 'UPDATED' | 'CANCELLED';
  }[];
}

@ApiTags('realtime')
@Controller('realtime')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RealtimeController {
  constructor(private readonly gtfsRealtimeService: GtfsRealtimeService) {}

  @Get('trip-updates/:feedId')
  @ApiOperation({ summary: 'Get real-time trip updates for a feed' })
  @ApiParam({ name: 'feedId', description: 'GTFS feed ID' })
  @ApiResponse({
    status: 200,
    description: 'List of trip updates',
    type: [TripUpdateDto],
  })
  async getTripUpdates(@Param('feedId') feedId: string): Promise<TripUpdateDto[]> {
    return this.gtfsRealtimeService.getTripUpdates(feedId);
  }

  @Get('vehicle-positions/:feedId')
  @ApiOperation({ summary: 'Get real-time vehicle positions for a feed' })
  @ApiParam({ name: 'feedId', description: 'GTFS feed ID' })
  @ApiResponse({
    status: 200,
    description: 'List of vehicle positions',
    type: [VehiclePositionDto],
  })
  async getVehiclePositions(@Param('feedId') feedId: string): Promise<VehiclePositionDto[]> {
    return this.gtfsRealtimeService.getVehiclePositions(feedId);
  }

  @Get('alerts/:feedId')
  @ApiOperation({ summary: 'Get real-time service alerts for a feed' })
  @ApiParam({ name: 'feedId', description: 'GTFS feed ID' })
  @ApiResponse({
    status: 200,
    description: 'List of service alerts',
    type: [AlertDto],
  })
  async getAlerts(@Param('feedId') feedId: string): Promise<AlertDto[]> {
    return this.gtfsRealtimeService.getAlerts(feedId);
  }

  @Get('trip/:feedId/:tripId/delay')
  @ApiOperation({ summary: 'Get delay for a specific trip' })
  @ApiParam({ name: 'feedId', description: 'GTFS feed ID' })
  @ApiParam({ name: 'tripId', description: 'Trip ID' })
  @ApiResponse({
    status: 200,
    description: 'Trip delay in seconds (positive = late, negative = early)',
    schema: { type: 'number', nullable: true },
  })
  async getTripDelay(
    @Param('feedId') feedId: string,
    @Param('tripId') tripId: string,
  ): Promise<{ delay: number | null }> {
    const delay = this.gtfsRealtimeService.getTripDelay(feedId, tripId);
    return { delay };
  }

  @Get('vehicle/:feedId/:vehicleId/location')
  @ApiOperation({ summary: 'Get location for a specific vehicle' })
  @ApiParam({ name: 'feedId', description: 'GTFS feed ID' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID' })
  @ApiResponse({
    status: 200,
    description: 'Vehicle location and status',
    type: VehiclePositionDto,
  })
  async getVehicleLocation(
    @Param('feedId') feedId: string,
    @Param('vehicleId') vehicleId: string,
  ): Promise<VehiclePositionDto | null> {
    return this.gtfsRealtimeService.getVehicleLocation(feedId, vehicleId);
  }

  @Get('route/:feedId/:routeId/alerts')
  @ApiOperation({ summary: 'Get active alerts for a specific route' })
  @ApiParam({ name: 'feedId', description: 'GTFS feed ID' })
  @ApiParam({ name: 'routeId', description: 'Route ID' })
  @ApiResponse({
    status: 200,
    description: 'Active alerts affecting this route',
    type: [AlertDto],
  })
  async getRouteAlerts(
    @Param('feedId') feedId: string,
    @Param('routeId') routeId: string,
  ): Promise<AlertDto[]> {
    return this.gtfsRealtimeService.getActiveAlertsForRoute(feedId, routeId);
  }

  @Get('stop/:feedId/:stopId/predictions')
  @ApiOperation({ summary: 'Get real-time arrival predictions for a stop' })
  @ApiParam({ name: 'feedId', description: 'GTFS feed ID' })
  @ApiParam({ name: 'stopId', description: 'Stop ID' })
  @ApiQuery({ 
    name: 'limit', 
    description: 'Maximum number of predictions to return', 
    required: false,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Real-time arrival predictions',
    type: StopPredictionDto,
  })
  async getStopPredictions(
    @Param('feedId') feedId: string,
    @Param('stopId') stopId: string,
    @Query('limit') limit?: number,
  ): Promise<StopPredictionDto> {
    const predictions = this.gtfsRealtimeService.getStopPredictions(feedId, stopId);
    const limitedPredictions = limit ? predictions.slice(0, limit) : predictions;

    return {
      stopId,
      predictions: limitedPredictions.map(pred => ({
        routeId: pred.stopId || '',
        tripId: pred.stopId || '',
        arrivalTime: pred.arrival?.time,
        departureTime: pred.departure?.time,
        delay: pred.arrival?.delay || pred.departure?.delay,
        realtimeStatus: pred.scheduleRelationship === 1 ? 'CANCELLED' : 
                      (pred.arrival?.delay || pred.departure?.delay) ? 'UPDATED' : 'SCHEDULED',
      })),
    };
  }

  @Get('status/:feedId')
  @ApiOperation({ summary: 'Get real-time feed status and last update time' })
  @ApiParam({ name: 'feedId', description: 'GTFS feed ID' })
  @ApiResponse({
    status: 200,
    description: 'Feed status information',
    schema: {
      type: 'object',
      properties: {
        feedId: { type: 'string' },
        lastUpdateTime: { type: 'number' },
        tripUpdatesCount: { type: 'number' },
        vehiclePositionsCount: { type: 'number' },
        alertsCount: { type: 'number' },
        isStale: { type: 'boolean' },
      },
    },
  })
  async getFeedStatus(@Param('feedId') feedId: string) {
    const lastUpdateTime = this.gtfsRealtimeService.getLastUpdateTime(feedId);
    const tripUpdates = this.gtfsRealtimeService.getTripUpdates(feedId);
    const vehiclePositions = this.gtfsRealtimeService.getVehiclePositions(feedId);
    const alerts = this.gtfsRealtimeService.getAlerts(feedId);
    
    // Consider data stale if it's older than 5 minutes
    const isStale = Date.now() - lastUpdateTime > 5 * 60 * 1000;

    return {
      feedId,
      lastUpdateTime,
      tripUpdatesCount: tripUpdates.length,
      vehiclePositionsCount: vehiclePositions.length,
      alertsCount: alerts.length,
      isStale,
    };
  }
}