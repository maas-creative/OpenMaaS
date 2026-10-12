export interface Place {
  name: string;
  lat: number;
  lon: number;
  address?: string;
}
export interface Map {
  points: (Place & { id: string; purpose?: string })[];
  segments: {
    kind: 'walk' | 'transit';
    routeName?: string;
    geometrySource: string;
    polyline: { lat: number; lon: number }[];
  }[];
}
export interface Route {
  timezone?: string;
  id?: string;
  recommended?: boolean;
  start: string;
  end: string;
  duration?: number;
  transfers?: number;
  walkSeconds?: number;
  waitSeconds?: number;
  fare?: { currency: string; ticket: number; ic?: number };
  map?: Map;
  legs: {
    mode: string;
    routeShortName?: string;
    trainType?: string;
    headsign?: string;
    headwayBased?: boolean;
    from: { id?: string; name: string; platformCode?: string };
    to: { name: string; platformCode?: string };
    startTime: string;
    endTime: string;
  }[];
}
export interface Search {
  origin: Place;
  destination: Place;
  dateTime: string;
  searchType: string;
  strategy: string;
  maxTransfers: number;
  avoidWalk: boolean;
}
export interface Journey {
  provider: string;
  fetchedAt?: string;
  timezone?: string;
  search?: Search;
  itineraries: Route[];
  coverage?: {
    feeds: { feedId: string; name: string; stale?: boolean }[];
    notices: { message: string; severity: string; code: string }[];
  };
  attribution?: string;
}

export interface SavedPlan {
  id: string;
  title: string;
  items: {
    [key: string]: unknown;
    type: string;
    title: string;
    status: string;
    start?: string;
    end?: string;
    data?: Journey;
  }[];
}
