export type TripPurpose = 'business' | 'personal' | 'medical' | 'charity';

export interface RoutePoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  speed: number;
  accuracy: number;
}

export interface Trip {
  id: string;
  startTime: number;
  endTime: number;
  distance: number;
  duration: number;
  purpose: TripPurpose;
  projectId: string | null;
  vehicleId: string | null;
  notes: string;
  routePoints: RoutePoint[];
}

export interface TripDraft {
  startTime: number;
  endTime: number;
  distance: number;
  duration: number;
  routePoints: RoutePoint[];
}

export interface Project {
  id: string;
  name: string;
}

export interface Vehicle {
  id: string;
  name: string;
}

export type DistanceUnit = 'miles' | 'km';

export interface AppSettings {
  rounding: '0.1' | '0.01';
  lockTripsAfter24h: boolean;
  allowEdits: boolean;
  autoDetectDriving: boolean;
  distanceUnit: DistanceUnit;
}
