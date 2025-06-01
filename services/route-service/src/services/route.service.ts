import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpService } from './otp.service';
import { CacheService } from './cache.service';
import {
  RoutePlanRequestDto,
  RoutePlanResponseDto,
  GeocodingRequestDto,
  GeocodingResponseDto,
} from '../dto/route-plan.dto';
import { TransportMode } from '@openmaas/types';

@Injectable()
export class RouteService {
  private readonly logger = new Logger(RouteService.name);

  constructor(
    private readonly otpService: OtpService,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {}

  async planRoute(request: RoutePlanRequestDto): Promise<RoutePlanResponseDto> {
    try {
      // Generate cache key based on request parameters
      const cacheKey = this.generateCacheKey(request);

      // Try to get cached result
      const cached = await this.cacheService.get<RoutePlanResponseDto>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for route planning: ${cacheKey}`);
        return cached;
      }

      // Validate and enhance request
      const enhancedRequest = await this.enhanceRequest(request);

      // Plan route using OTP
      const result = await this.otpService.planRoute(enhancedRequest);

      // Post-process and enrich results
      const enrichedResult = await this.enrichResult(result);

      // Cache the result (cache for 5 minutes for route plans)
      await this.cacheService.set(cacheKey, enrichedResult, 300);

      this.logger.log(`Route planned successfully: ${result.itineraries.length} itineraries found`);
      return enrichedResult;
    } catch (error) {
      this.logger.error('Error in route planning:', error);
      throw error;
    }
  }

  async geocode(request: GeocodingRequestDto): Promise<GeocodingResponseDto> {
    try {
      // Generate cache key for geocoding
      const cacheKey = `geocode:${request.query}:${request.limit || 5}`;

      // Try to get cached result
      const cached = await this.cacheService.get<GeocodingResponseDto>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for geocoding: ${cacheKey}`);
        return cached;
      }

      // Geocode using OTP
      const result = await this.otpService.geocode(request);

      // Cache the result (cache for 1 hour for geocoding)
      await this.cacheService.set(cacheKey, result, 3600);

      this.logger.log(
        `Geocoded successfully: ${result.results.length} results for "${request.query}"`,
      );
      return result;
    } catch (error) {
      this.logger.error('Error in geocoding:', error);
      throw error;
    }
  }

  async reverseGeocode(lat: number, lon: number): Promise<GeocodingResponseDto> {
    try {
      const cacheKey = `reverse:${lat.toFixed(6)}:${lon.toFixed(6)}`;

      // Try to get cached result
      const cached = await this.cacheService.get<GeocodingResponseDto>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for reverse geocoding: ${cacheKey}`);
        return cached;
      }

      // Simple reverse geocoding - in a real implementation, you might use
      // a dedicated geocoding service or OTP's reverse geocoding endpoint
      const result: GeocodingResponseDto = {
        query: `${lat},${lon}`,
        results: [
          {
            lat,
            lon,
            name: `Location at ${lat.toFixed(4)}, ${lon.toFixed(4)}`,
          },
        ],
      };

      // Cache the result (cache for 1 hour)
      await this.cacheService.set(cacheKey, result, 3600);

      return result;
    } catch (error) {
      this.logger.error('Error in reverse geocoding:', error);
      throw error;
    }
  }

  private async enhanceRequest(request: RoutePlanRequestDto): Promise<RoutePlanRequestDto> {
    // Set default values from configuration
    const enhanced = { ...request };

    if (!enhanced.modes || enhanced.modes.length === 0) {
      enhanced.modes = [TransportMode.WALK, TransportMode.TRANSIT];
    }

    if (!enhanced.maxWalkDistance) {
      enhanced.maxWalkDistance = this.configService.get('routePlanning.maxWalkDistance');
    }

    if (!enhanced.numItineraries) {
      enhanced.numItineraries = this.configService.get('routePlanning.defaultNumItineraries');
    }

    // Set default time to now if not provided
    if (!enhanced.dateTime) {
      enhanced.dateTime = new Date().toISOString();
      enhanced.arriveBy = false;
    }

    return enhanced;
  }

  private async enrichResult(result: RoutePlanResponseDto): Promise<RoutePlanResponseDto> {
    // Add any additional enrichment here, such as:
    // - Real-time updates
    // - Fare information
    // - Carbon footprint calculations
    // - Weather information

    const enriched = { ...result };

    // Calculate environmental impact
    enriched.itineraries = enriched.itineraries.map((itinerary) => ({
      ...itinerary,
      // Add custom properties or enhance existing ones
    }));

    return enriched;
  }

  private generateCacheKey(request: RoutePlanRequestDto): string {
    const keyParts = [
      'route',
      `${request.from.lat.toFixed(6)},${request.from.lon.toFixed(6)}`,
      `${request.to.lat.toFixed(6)},${request.to.lon.toFixed(6)}`,
      request.dateTime ? new Date(request.dateTime).toISOString() : 'now',
      request.arriveBy ? 'arrive' : 'depart',
      request.modes?.sort().join(',') || 'default',
      request.maxWalkDistance || 'default',
      request.wheelchairAccessible ? 'wheelchair' : 'standard',
      request.numItineraries || 'default',
    ];

    return keyParts.join(':');
  }

  async getRouteMetrics(): Promise<Record<string, unknown>> {
    // Return service metrics for monitoring
    return {
      service: 'route-service',
      version: '1.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      // Add more metrics as needed
    };
  }
}
