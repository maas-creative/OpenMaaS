import { Injectable, Logger, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import fetch from 'node-fetch';
import { RoutePlanRequestDto, RoutePlanResponseDto, GeocodingRequestDto, GeocodingResponseDto } from '../dto/route-plan.dto';
import { TransportMode } from '@openmaas/types';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly otpUrl: string;
  private readonly timeout: number;

  constructor(private readonly configService: ConfigService) {
    this.otpUrl = this.configService.get('otp.url');
    this.timeout = this.configService.get('otp.timeout');
  }

  async planRoute(request: RoutePlanRequestDto): Promise<RoutePlanResponseDto> {
    try {
      const otpParams = this.buildOtpParams(request);
      const url = `${this.otpUrl}/plan?${otpParams.toString()}`;
      
      this.logger.debug(`OTP request: ${url}`);

      const response = await fetch(url, {
        timeout: this.timeout,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'OpenMaaS-RouteService/1.0',
        },
      });

      if (!response.ok) {
        throw new ServiceUnavailableException(
          `OTP returned ${response.status}: ${response.statusText}`,
        );
      }

      const otpResponse = await response.json();
      
      if (otpResponse.error) {
        throw new BadRequestException(
          `OTP error: ${otpResponse.error.message || 'Unknown error'}`,
        );
      }

      return this.transformOtpResponse(otpResponse, request);
    } catch (error) {
      this.logger.error('Error planning route with OTP:', error);
      
      if (error instanceof BadRequestException || error instanceof ServiceUnavailableException) {
        throw error;
      }
      
      throw new ServiceUnavailableException('Route planning service temporarily unavailable');
    }
  }

  async geocode(request: GeocodingRequestDto): Promise<GeocodingResponseDto> {
    try {
      const params = new URLSearchParams({
        query: request.query,
        size: (request.limit || 5).toString(),
      });

      if (request.focusLat && request.focusLon) {
        params.append('focus.point.lat', request.focusLat.toString());
        params.append('focus.point.lon', request.focusLon.toString());
      }

      const url = `${this.otpUrl}/geocoding?${params.toString()}`;
      
      this.logger.debug(`OTP geocoding request: ${url}`);

      const response = await fetch(url, {
        timeout: this.timeout,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'OpenMaaS-RouteService/1.0',
        },
      });

      if (!response.ok) {
        throw new ServiceUnavailableException(
          `OTP geocoding returned ${response.status}: ${response.statusText}`,
        );
      }

      const otpResponse = await response.json();
      
      return {
        query: request.query,
        results: otpResponse.features?.map(feature => ({
          lat: feature.geometry.coordinates[1],
          lon: feature.geometry.coordinates[0],
          name: feature.properties.label || feature.properties.name,
          stopId: feature.properties.gid?.startsWith('gtfs') ? feature.properties.source_id : undefined,
        })) || [],
      };
    } catch (error) {
      this.logger.error('Error geocoding with OTP:', error);
      
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      
      throw new ServiceUnavailableException('Geocoding service temporarily unavailable');
    }
  }

  private buildOtpParams(request: RoutePlanRequestDto): URLSearchParams {
    const params = new URLSearchParams();

    // Basic location parameters
    params.append('fromPlace', `${request.from.lat},${request.from.lon}`);
    params.append('toPlace', `${request.to.lat},${request.to.lon}`);

    // Time parameters
    if (request.dateTime) {
      const date = new Date(request.dateTime);
      params.append('date', date.toISOString().split('T')[0]);
      params.append('time', date.toTimeString().split(' ')[0]);
      params.append('arriveBy', (request.arriveBy || false).toString());
    }

    // Transport modes
    if (request.modes && request.modes.length > 0) {
      const otpModes = this.mapToOtpModes(request.modes);
      params.append('mode', otpModes.join(','));
    } else {
      params.append('mode', 'WALK,TRANSIT');
    }

    // Walking/biking parameters
    const maxWalkDistance = request.maxWalkDistance || 
      this.configService.get('routePlanning.maxWalkDistance');
    params.append('maxWalkDistance', maxWalkDistance.toString());

    if (request.modes?.includes(TransportMode.BICYCLE)) {
      const maxBikeDistance = this.configService.get('routePlanning.maxBikeDistance');
      params.append('maxBikeDistance', maxBikeDistance.toString());
    }

    // Accessibility
    if (request.wheelchairAccessible) {
      params.append('wheelchair', 'true');
    }

    // Number of itineraries
    const numItineraries = request.numItineraries || 
      this.configService.get('routePlanning.defaultNumItineraries');
    params.append('numItineraries', numItineraries.toString());

    // Preferred/avoided routes
    if (request.preferredRoutes && request.preferredRoutes.length > 0) {
      params.append('preferredRoutes', request.preferredRoutes.join(','));
    }

    if (request.avoidRoutes && request.avoidRoutes.length > 0) {
      params.append('bannedRoutes', request.avoidRoutes.join(','));
    }

    // Additional OTP parameters
    params.append('showIntermediateStops', 'true');
    params.append('locale', 'ja');

    return params;
  }

  private mapToOtpModes(modes: TransportMode[]): string[] {
    const otpModes = [];
    
    if (modes.includes(TransportMode.WALK)) {
      otpModes.push('WALK');
    }
    
    if (modes.includes(TransportMode.BICYCLE)) {
      otpModes.push('BICYCLE');
    }
    
    if (modes.includes(TransportMode.CAR)) {
      otpModes.push('CAR');
    }
    
    if (modes.some(mode => [
      TransportMode.TRANSIT,
      TransportMode.BUS,
      TransportMode.TRAM,
      TransportMode.RAIL,
      TransportMode.SUBWAY,
      TransportMode.FERRY,
    ].includes(mode))) {
      otpModes.push('TRANSIT');
    }

    return otpModes.length > 0 ? otpModes : ['WALK', 'TRANSIT'];
  }

  private transformOtpResponse(otpResponse: any, request: RoutePlanRequestDto): RoutePlanResponseDto {
    const itineraries = otpResponse.plan?.itineraries?.map(itinerary => ({
      startTime: new Date(itinerary.startTime),
      endTime: new Date(itinerary.endTime),
      duration: itinerary.duration,
      transfers: itinerary.transfers || 0,
      walkDistance: itinerary.walkDistance || 0,
      walkTime: itinerary.walkTime || 0,
      waitingTime: itinerary.waitingTime || 0,
      legs: itinerary.legs?.map(leg => ({
        startTime: new Date(leg.startTime),
        endTime: new Date(leg.endTime),
        duration: leg.duration,
        distance: leg.distance,
        mode: this.mapFromOtpMode(leg.mode),
        from: {
          name: leg.from.name,
          lat: leg.from.lat,
          lon: leg.from.lon,
          stopId: leg.from.stopId,
          platformCode: leg.from.platformCode,
        },
        to: {
          name: leg.to.name,
          lat: leg.to.lat,
          lon: leg.to.lon,
          stopId: leg.to.stopId,
          platformCode: leg.to.platformCode,
        },
        legGeometry: leg.legGeometry,
        realTime: leg.realTime,
        pathway: leg.pathway,
        route: leg.route,
        trip: leg.trip,
        intermediateStops: leg.intermediateStops,
        alerts: leg.alerts,
      })) || [],
      fare: itinerary.fare ? {
        type: itinerary.fare.type,
        currency: itinerary.fare.currency,
        cents: itinerary.fare.cents,
        components: itinerary.fare.details?.components || [],
      } : undefined,
    })) || [];

    return {
      itineraries,
      requestParameters: request,
      debugOutput: this.configService.get('app.env') === 'development' ? {
        otpUrl: this.otpUrl,
        otpResponse: otpResponse,
      } : undefined,
    };
  }

  private mapFromOtpMode(otpMode: string): TransportMode {
    switch (otpMode.toLowerCase()) {
      case 'walk':
        return TransportMode.WALK;
      case 'bicycle':
        return TransportMode.BICYCLE;
      case 'car':
        return TransportMode.CAR;
      case 'bus':
        return TransportMode.BUS;
      case 'tram':
        return TransportMode.TRAM;
      case 'rail':
        return TransportMode.RAIL;
      case 'subway':
        return TransportMode.SUBWAY;
      case 'ferry':
        return TransportMode.FERRY;
      default:
        return TransportMode.TRANSIT;
    }
  }
}