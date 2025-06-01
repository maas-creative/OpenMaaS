import { Injectable, NotFoundException } from '@nestjs/common';
import { AgencyRepository } from '../repositories/agency.repository';
import { StopRepository } from '../repositories/stop.repository';
import { RouteRepository } from '../repositories/route.repository';
import { AgencyResponseDto } from '../dto/agency.dto';
import { StopResponseDto, StopSearchDto } from '../dto/stop.dto';
import { RouteResponseDto, RouteSearchDto } from '../dto/route.dto';
import { RouteType } from '@openmaas/types';

@Injectable()
export class TransitService {
  constructor(
    private readonly agencyRepository: AgencyRepository,
    private readonly stopRepository: StopRepository,
    private readonly routeRepository: RouteRepository,
  ) {}

  // Agency methods
  async getAgencies(): Promise<AgencyResponseDto[]> {
    const agencies = await this.agencyRepository.findAll();
    return agencies.map(this.toAgencyDto);
  }

  async getAgency(agencyId: string): Promise<AgencyResponseDto> {
    const agency = await this.agencyRepository.findById(agencyId);
    if (!agency) {
      throw new NotFoundException(`Agency with ID ${agencyId} not found`);
    }
    return this.toAgencyDto(agency);
  }

  // Stop methods
  async getStops(query: StopSearchDto): Promise<StopResponseDto[]> {
    let stops;

    if (query.lat && query.lon && query.radius) {
      stops = await this.stopRepository.findNearby(
        query.lat,
        query.lon,
        query.radius,
        query.limit || 20,
      );
    } else if (query.search) {
      stops = await this.stopRepository.search(query.search, query.limit || 20);
    } else {
      stops = await this.stopRepository.findAll();
      if (query.limit) {
        stops = stops.slice(0, query.limit);
      }
    }

    return stops.map(this.toStopDto);
  }

  async getStop(stopId: string): Promise<StopResponseDto> {
    const stop = await this.stopRepository.findById(stopId);
    if (!stop) {
      throw new NotFoundException(`Stop with ID ${stopId} not found`);
    }
    return this.toStopDto(stop);
  }

  async getStopsByIds(stopIds: string[]): Promise<StopResponseDto[]> {
    const stops = await this.stopRepository.findByIds(stopIds);
    return stops.map(this.toStopDto);
  }

  // Route methods
  async getRoutes(query: RouteSearchDto): Promise<RouteResponseDto[]> {
    let routes;

    if (query.agencyId) {
      routes = await this.routeRepository.findByAgency(query.agencyId);
    } else if (query.routeType !== undefined) {
      routes = await this.routeRepository.findByType(query.routeType);
    } else if (query.search) {
      routes = await this.routeRepository.search(query.search, query.limit || 20);
    } else {
      routes = await this.routeRepository.findAll();
      if (query.limit) {
        routes = routes.slice(0, query.limit);
      }
    }

    return routes.map(this.toRouteDto);
  }

  async getRoute(routeId: string): Promise<RouteResponseDto> {
    const route = await this.routeRepository.findById(routeId);
    if (!route) {
      throw new NotFoundException(`Route with ID ${routeId} not found`);
    }
    return this.toRouteDto(route);
  }

  async getRoutesByAgency(agencyId: string): Promise<RouteResponseDto[]> {
    const routes = await this.routeRepository.findByAgency(agencyId);
    return routes.map(this.toRouteDto);
  }

  // Helper methods
  private toAgencyDto(entity: any): AgencyResponseDto {
    return {
      agencyId: entity.agencyId,
      agencyName: entity.agencyName,
      agencyUrl: entity.agencyUrl,
      agencyTimezone: entity.agencyTimezone,
      agencyLang: entity.agencyLang,
      agencyPhone: entity.agencyPhone,
      agencyFareUrl: entity.agencyFareUrl,
    };
  }

  private toStopDto(entity: any): StopResponseDto {
    return {
      stopId: entity.stopId,
      stopCode: entity.stopCode,
      stopName: entity.stopName,
      stopDesc: entity.stopDesc,
      stopLat: parseFloat(entity.stopLat),
      stopLon: parseFloat(entity.stopLon),
      zoneId: entity.zoneId,
      stopUrl: entity.stopUrl,
      locationType: entity.locationType,
      parentStation: entity.parentStation,
      stopTimezone: entity.stopTimezone,
      wheelchairBoarding: entity.wheelchairBoarding,
    };
  }

  private toRouteDto(entity: any): RouteResponseDto {
    return {
      routeId: entity.routeId,
      agencyId: entity.agencyId,
      routeShortName: entity.routeShortName,
      routeLongName: entity.routeLongName,
      routeDesc: entity.routeDesc,
      routeType: entity.routeType as RouteType,
      routeUrl: entity.routeUrl,
      routeColor: entity.routeColor,
      routeTextColor: entity.routeTextColor,
      routeSortOrder: entity.routeSortOrder,
    };
  }
}
