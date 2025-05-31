// GTFS-based types
export interface Agency {
  agencyId: string;
  agencyName: string;
  agencyUrl?: string;
  agencyTimezone: string;
  agencyLang?: string;
  agencyPhone?: string;
  agencyFareUrl?: string;
}

export interface Stop {
  stopId: string;
  stopCode?: string;
  stopName: string;
  stopDesc?: string;
  stopLat: number;
  stopLon: number;
  zoneId?: string;
  stopUrl?: string;
  locationType?: LocationType;
  parentStation?: string;
  stopTimezone?: string;
  wheelchairBoarding?: WheelchairBoarding;
}

export enum LocationType {
  STOP = 0,
  STATION = 1,
  ENTRANCE_EXIT = 2,
  GENERIC_NODE = 3,
  BOARDING_AREA = 4,
}

export enum WheelchairBoarding {
  NO_INFO = 0,
  POSSIBLE = 1,
  NOT_POSSIBLE = 2,
}

export interface Route {
  routeId: string;
  agencyId?: string;
  routeShortName?: string;
  routeLongName: string;
  routeDesc?: string;
  routeType: RouteType;
  routeUrl?: string;
  routeColor?: string;
  routeTextColor?: string;
  routeSortOrder?: number;
}

export enum RouteType {
  TRAM = 0,
  SUBWAY = 1,
  RAIL = 2,
  BUS = 3,
  FERRY = 4,
  CABLE_TRAM = 5,
  AERIAL_LIFT = 6,
  FUNICULAR = 7,
  TROLLEYBUS = 11,
  MONORAIL = 12,
}

export interface Trip {
  tripId: string;
  routeId: string;
  serviceId: string;
  tripHeadsign?: string;
  tripShortName?: string;
  directionId?: number;
  blockId?: string;
  shapeId?: string;
  wheelchairAccessible?: WheelchairAccessible;
  bikesAllowed?: BikesAllowed;
}

export enum WheelchairAccessible {
  NO_INFO = 0,
  POSSIBLE = 1,
  NOT_POSSIBLE = 2,
}

export enum BikesAllowed {
  NO_INFO = 0,
  ALLOWED = 1,
  NOT_ALLOWED = 2,
}

export interface StopTime {
  tripId: string;
  arrivalTime: string;
  departureTime: string;
  stopId: string;
  stopSequence: number;
  stopHeadsign?: string;
  pickupType?: PickupDropOffType;
  dropOffType?: PickupDropOffType;
  continuousPickup?: ContinuousPickupDropOff;
  continuousDropOff?: ContinuousPickupDropOff;
  shapeDistTraveled?: number;
  timepoint?: Timepoint;
}

export enum PickupDropOffType {
  REGULAR = 0,
  NOT_AVAILABLE = 1,
  PHONE_AGENCY = 2,
  COORDINATE_WITH_DRIVER = 3,
}

export enum ContinuousPickupDropOff {
  CONTINUOUS = 0,
  NOT_CONTINUOUS = 1,
  PHONE_AGENCY = 2,
  COORDINATE_WITH_DRIVER = 3,
}

export enum Timepoint {
  APPROXIMATE = 0,
  EXACT = 1,
}

// Route planning types
export interface RoutePlanRequest {
  from: Location;
  to: Location;
  dateTime?: Date;
  arriveBy?: boolean;
  modes?: TransportMode[];
  maxWalkDistance?: number;
  wheelchairAccessible?: boolean;
  numItineraries?: number;
  preferredRoutes?: string[];
  avoidRoutes?: string[];
}

export interface Location {
  lat: number;
  lon: number;
  name?: string;
  stopId?: string;
}

export enum TransportMode {
  WALK = 'WALK',
  BICYCLE = 'BICYCLE',
  CAR = 'CAR',
  TRANSIT = 'TRANSIT',
  BUS = 'BUS',
  TRAM = 'TRAM',
  RAIL = 'RAIL',
  SUBWAY = 'SUBWAY',
  FERRY = 'FERRY',
}

export interface RoutePlanResponse {
  itineraries: Itinerary[];
  requestParameters: RoutePlanRequest;
  debugOutput?: any;
}

export interface Itinerary {
  startTime: Date;
  endTime: Date;
  duration: number; // seconds
  transfers: number;
  walkDistance: number; // meters
  walkTime: number; // seconds
  waitingTime: number; // seconds
  legs: Leg[];
  fare?: Fare;
}

export interface Leg {
  startTime: Date;
  endTime: Date;
  duration: number; // seconds
  distance: number; // meters
  mode: TransportMode;
  from: Place;
  to: Place;
  legGeometry?: GeoJSON.LineString;
  realTime?: boolean;
  pathway?: boolean;
  route?: Route;
  trip?: Trip;
  intermediateStops?: Stop[];
  alerts?: Alert[];
}

export interface Place {
  name: string;
  lat: number;
  lon: number;
  stopId?: string;
  platformCode?: string;
  vertexType?: string;
}

export interface Fare {
  type: string;
  currency: string;
  cents: number;
  components: FareComponent[];
}

export interface FareComponent {
  fareId: string;
  currency: string;
  cents: number;
  routes: string[];
}

// Real-time updates
export interface Alert {
  id: string;
  alertHeaderText: string;
  alertDescriptionText?: string;
  alertUrl?: string;
  effectiveStartDate?: Date;
  effectiveEndDate?: Date;
  entities: AlertEntity[];
}

export interface AlertEntity {
  agencyId?: string;
  routeId?: string;
  tripId?: string;
  stopId?: string;
}

export interface VehiclePosition {
  vehicleId: string;
  tripId?: string;
  routeId?: string;
  directionId?: number;
  currentStopSequence?: number;
  currentStatus?: VehicleStopStatus;
  timestamp: Date;
  position: {
    latitude: number;
    longitude: number;
    bearing?: number;
    speed?: number;
  };
  occupancyStatus?: OccupancyStatus;
}

export enum VehicleStopStatus {
  INCOMING_AT = 0,
  STOPPED_AT = 1,
  IN_TRANSIT_TO = 2,
}

export enum OccupancyStatus {
  EMPTY = 0,
  MANY_SEATS_AVAILABLE = 1,
  FEW_SEATS_AVAILABLE = 2,
  STANDING_ROOM_ONLY = 3,
  CRUSHED_STANDING_ROOM_ONLY = 4,
  FULL = 5,
  NOT_ACCEPTING_PASSENGERS = 6,
}