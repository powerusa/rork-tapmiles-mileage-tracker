import type { RoutePoint, TripDraft } from '../types/trip';
import { haversineDistance } from './location';
import { routePointSchema } from './validation';

export interface PersistedTrackingState {
  isTracking: boolean;
  startTime: number;
  distance: number;
  routePoints: RoutePoint[];
  lastPoint: RoutePoint | null;
  pendingTrip?: TripDraft | null;
}
export function appendLocations(
  state: PersistedTrackingState,
  points: RoutePoint[],
): PersistedTrackingState {
  if (!state.isTracking) return state;
  let { distance, lastPoint } = state;
  const routePoints = [...state.routePoints];
  for (const point of [...points].sort((a, b) => a.timestamp - b.timestamp)) {
    if (
      !routePointSchema.safeParse(point).success ||
      point.accuracy > 50 ||
      point.timestamp < state.startTime
    )
      continue;
    if (lastPoint && point.timestamp <= lastPoint.timestamp) continue;
    if (lastPoint) {
      const miles = haversineDistance(
        lastPoint.latitude,
        lastPoint.longitude,
        point.latitude,
        point.longitude,
      );
      const seconds = (point.timestamp - lastPoint.timestamp) / 1000;
      // Reject GPS jumps over 200mph without replacing the last valid position.
      if ((miles / seconds) * 3600 > 200) continue;
      if (miles > 0.001) distance += miles;
    }
    lastPoint = point;
    routePoints.push(point);
  }
  return { ...state, distance, lastPoint, routePoints: routePoints.slice(-5000) };
}
