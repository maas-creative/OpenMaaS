import { Injectable, Logger } from '@nestjs/common';
import fetch from 'node-fetch';
import * as protobuf from 'protobufjs';

// GTFS Realtime data structures
interface TripUpdate {
  tripId: string;
  routeId: string;
  startTime?: string;
  startDate?: string;
  delay?: number;
  stopTimeUpdates: StopTimeUpdate[];
}

interface StopTimeUpdate {
  stopSequence?: number;
  stopId?: string;
  arrival?: TimeEvent;
  departure?: TimeEvent;
  scheduleRelationship?: ScheduleRelationship;
}

interface TimeEvent {
  time?: number;
  delay?: number;
  uncertainty?: number;
}

interface VehiclePosition {
  tripId?: string;
  routeId?: string;
  vehicleId: string;
  position: {
    latitude: number;
    longitude: number;
    bearing?: number;
    speed?: number;
  };
  currentStopSequence?: number;
  currentStatus?: VehicleStopStatus;
  timestamp?: number;
  congestionLevel?: CongestionLevel;
  occupancyStatus?: OccupancyStatus;
}

interface Alert {
  alertId: string;
  activePeriods: {
    start?: number;
    end?: number;
  }[];
  informedEntities: {
    agencyId?: string;
    routeId?: string;
    routeType?: number;
    trip?: {
      tripId: string;
      routeId?: string;
    };
    stopId?: string;
  }[];
  cause?: Cause;
  effect?: Effect;
  url?: string;
  headerText: string;
  descriptionText: string;
}

enum ScheduleRelationship {
  SCHEDULED = 0,
  SKIPPED = 1,
  NO_DATA = 2,
  UNSCHEDULED = 3,
}

enum VehicleStopStatus {
  INCOMING_AT = 0,
  STOPPED_AT = 1,
  IN_TRANSIT_TO = 2,
}

enum CongestionLevel {
  UNKNOWN_CONGESTION_LEVEL = 0,
  RUNNING_SMOOTHLY = 1,
  STOP_AND_GO = 2,
  CONGESTION = 3,
  SEVERE_CONGESTION = 4,
}

enum OccupancyStatus {
  EMPTY = 0,
  MANY_SEATS_AVAILABLE = 1,
  FEW_SEATS_AVAILABLE = 2,
  STANDING_ROOM_ONLY = 3,
  CRUSHED_STANDING_ROOM_ONLY = 4,
  FULL = 5,
  NOT_ACCEPTING_PASSENGERS = 6,
}

enum Cause {
  UNKNOWN_CAUSE = 1,
  OTHER_CAUSE = 2,
  TECHNICAL_PROBLEM = 3,
  STRIKE = 4,
  DEMONSTRATION = 5,
  ACCIDENT = 6,
  HOLIDAY = 7,
  WEATHER = 8,
  MAINTENANCE = 9,
  CONSTRUCTION = 10,
  POLICE_ACTIVITY = 11,
  MEDICAL_EMERGENCY = 12,
}

enum Effect {
  NO_SERVICE = 1,
  REDUCED_SERVICE = 2,
  SIGNIFICANT_DELAYS = 3,
  DETOUR = 4,
  ADDITIONAL_SERVICE = 5,
  MODIFIED_SERVICE = 6,
  OTHER_EFFECT = 7,
  UNKNOWN_EFFECT = 8,
  STOP_MOVED = 9,
  NO_EFFECT = 10,
  ACCESSIBILITY_ISSUE = 11,
}

@Injectable()
export class GtfsRealtimeService {
  private readonly logger = new Logger(GtfsRealtimeService.name);
  private tripUpdatesCache = new Map<string, TripUpdate[]>();
  private vehiclePositionsCache = new Map<string, VehiclePosition[]>();
  private alertsCache = new Map<string, Alert[]>();
  private lastUpdateTime = new Map<string, number>();

  constructor() {}

  async fetchTripUpdates(feedId: string, realtimeUrl: string): Promise<TripUpdate[]> {
    try {
      const response = await fetch(realtimeUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch trip updates: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      const feed = await this.parseGtfsRealtimeFeed(buffer);
      
      const tripUpdates: TripUpdate[] = [];
      
      for (const entity of feed.entity || []) {
        if (entity.tripUpdate) {
          const tripUpdate = this.parseTripUpdate(entity.tripUpdate);
          if (tripUpdate) {
            tripUpdates.push(tripUpdate);
          }
        }
      }

      this.tripUpdatesCache.set(feedId, tripUpdates);
      this.lastUpdateTime.set(feedId, Date.now());
      
      this.logger.log(`Fetched ${tripUpdates.length} trip updates for feed ${feedId}`);
      return tripUpdates;
    } catch (error) {
      this.logger.error(`Error fetching trip updates for feed ${feedId}:`, error);
      return this.tripUpdatesCache.get(feedId) || [];
    }
  }

  async fetchVehiclePositions(feedId: string, realtimeUrl: string): Promise<VehiclePosition[]> {
    try {
      const response = await fetch(realtimeUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch vehicle positions: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      const feed = await this.parseGtfsRealtimeFeed(buffer);
      
      const vehiclePositions: VehiclePosition[] = [];
      
      for (const entity of feed.entity || []) {
        if (entity.vehicle) {
          const vehiclePosition = this.parseVehiclePosition(entity.vehicle);
          if (vehiclePosition) {
            vehiclePositions.push(vehiclePosition);
          }
        }
      }

      this.vehiclePositionsCache.set(feedId, vehiclePositions);
      this.lastUpdateTime.set(feedId, Date.now());
      
      this.logger.log(`Fetched ${vehiclePositions.length} vehicle positions for feed ${feedId}`);
      return vehiclePositions;
    } catch (error) {
      this.logger.error(`Error fetching vehicle positions for feed ${feedId}:`, error);
      return this.vehiclePositionsCache.get(feedId) || [];
    }
  }

  async fetchAlerts(feedId: string, realtimeUrl: string): Promise<Alert[]> {
    try {
      const response = await fetch(realtimeUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch alerts: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      const feed = await this.parseGtfsRealtimeFeed(buffer);
      
      const alerts: Alert[] = [];
      
      for (const entity of feed.entity || []) {
        if (entity.alert) {
          const alert = this.parseAlert(entity.id, entity.alert);
          if (alert) {
            alerts.push(alert);
          }
        }
      }

      this.alertsCache.set(feedId, alerts);
      this.lastUpdateTime.set(feedId, Date.now());
      
      this.logger.log(`Fetched ${alerts.length} alerts for feed ${feedId}`);
      return alerts;
    } catch (error) {
      this.logger.error(`Error fetching alerts for feed ${feedId}:`, error);
      return this.alertsCache.get(feedId) || [];
    }
  }

  private async parseGtfsRealtimeFeed(buffer: ArrayBuffer): Promise<any> {
    try {
      // Load GTFS Realtime protobuf definition
      const root = await protobuf.load('/path/to/gtfs-realtime.proto');
      const FeedMessage = root.lookupType('transit_realtime.FeedMessage');
      
      const message = FeedMessage.decode(new Uint8Array(buffer));
      return FeedMessage.toObject(message);
    } catch (error) {
      // Fallback: try to parse as JSON (for testing)
      const text = Buffer.from(buffer).toString();
      return JSON.parse(text);
    }
  }

  private parseTripUpdate(tripUpdate: any): TripUpdate | null {
    if (!tripUpdate.trip) return null;

    const stopTimeUpdates: StopTimeUpdate[] = [];
    
    for (const stu of tripUpdate.stopTimeUpdate || []) {
      stopTimeUpdates.push({
        stopSequence: stu.stopSequence,
        stopId: stu.stopId,
        arrival: stu.arrival ? {
          time: stu.arrival.time,
          delay: stu.arrival.delay,
          uncertainty: stu.arrival.uncertainty,
        } : undefined,
        departure: stu.departure ? {
          time: stu.departure.time,
          delay: stu.departure.delay,
          uncertainty: stu.departure.uncertainty,
        } : undefined,
        scheduleRelationship: stu.scheduleRelationship || ScheduleRelationship.SCHEDULED,
      });
    }

    return {
      tripId: tripUpdate.trip.tripId,
      routeId: tripUpdate.trip.routeId,
      startTime: tripUpdate.trip.startTime,
      startDate: tripUpdate.trip.startDate,
      delay: tripUpdate.delay,
      stopTimeUpdates,
    };
  }

  private parseVehiclePosition(vehicle: any): VehiclePosition | null {
    if (!vehicle.position || !vehicle.vehicle?.id) return null;

    return {
      tripId: vehicle.trip?.tripId,
      routeId: vehicle.trip?.routeId,
      vehicleId: vehicle.vehicle.id,
      position: {
        latitude: vehicle.position.latitude,
        longitude: vehicle.position.longitude,
        bearing: vehicle.position.bearing,
        speed: vehicle.position.speed,
      },
      currentStopSequence: vehicle.currentStopSequence,
      currentStatus: vehicle.currentStatus || VehicleStopStatus.IN_TRANSIT_TO,
      timestamp: vehicle.timestamp,
      congestionLevel: vehicle.congestionLevel,
      occupancyStatus: vehicle.occupancyStatus,
    };
  }

  private parseAlert(alertId: string, alert: any): Alert | null {
    if (!alert.headerText || !alert.descriptionText) return null;

    return {
      alertId,
      activePeriods: alert.activePeriod || [],
      informedEntities: alert.informedEntity || [],
      cause: alert.cause,
      effect: alert.effect,
      url: alert.url?.translation?.[0]?.text,
      headerText: alert.headerText.translation?.[0]?.text || '',
      descriptionText: alert.descriptionText.translation?.[0]?.text || '',
    };
  }

  // Get cached data methods
  getTripUpdates(feedId: string): TripUpdate[] {
    return this.tripUpdatesCache.get(feedId) || [];
  }

  getVehiclePositions(feedId: string): VehiclePosition[] {
    return this.vehiclePositionsCache.get(feedId) || [];
  }

  getAlerts(feedId: string): Alert[] {
    return this.alertsCache.get(feedId) || [];
  }

  getLastUpdateTime(feedId: string): number {
    return this.lastUpdateTime.get(feedId) || 0;
  }

  // Real-time query methods
  getTripDelay(feedId: string, tripId: string): number | null {
    const tripUpdates = this.getTripUpdates(feedId);
    const tripUpdate = tripUpdates.find(tu => tu.tripId === tripId);
    return tripUpdate?.delay || null;
  }

  getVehicleLocation(feedId: string, vehicleId: string): VehiclePosition | null {
    const vehiclePositions = this.getVehiclePositions(feedId);
    return vehiclePositions.find(vp => vp.vehicleId === vehicleId) || null;
  }

  getActiveAlertsForRoute(feedId: string, routeId: string): Alert[] {
    const alerts = this.getAlerts(feedId);
    const now = Date.now() / 1000;
    
    return alerts.filter(alert => {
      // Check if alert is currently active
      const isActive = alert.activePeriods.some(period => {
        const start = period.start || 0;
        const end = period.end || Number.MAX_SAFE_INTEGER;
        return now >= start && now <= end;
      });

      // Check if alert affects this route
      const affectsRoute = alert.informedEntities.some(entity => 
        entity.routeId === routeId
      );

      return isActive && affectsRoute;
    });
  }

  getStopPredictions(feedId: string, stopId: string): StopTimeUpdate[] {
    const tripUpdates = this.getTripUpdates(feedId);
    const predictions: StopTimeUpdate[] = [];

    for (const tripUpdate of tripUpdates) {
      const stopUpdate = tripUpdate.stopTimeUpdates.find(stu => stu.stopId === stopId);
      if (stopUpdate) {
        predictions.push(stopUpdate);
      }
    }

    return predictions.sort((a, b) => {
      const timeA = a.arrival?.time || a.departure?.time || 0;
      const timeB = b.arrival?.time || b.departure?.time || 0;
      return timeA - timeB;
    });
  }
}