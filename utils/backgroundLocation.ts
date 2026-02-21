import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RoutePoint } from '@/types/trip';
import { haversineDistance } from '@/utils/location';

export const BACKGROUND_LOCATION_TASK = 'TAPMILES_BACKGROUND_LOCATION';
export const TRACKING_STATE_KEY = '@tapmiles_tracking_state';

export interface PersistedTrackingState {
  isTracking: boolean;
  startTime: number;
  distance: number;
  routePoints: RoutePoint[];
  lastPoint: RoutePoint | null;
}

export async function getPersistedState(): Promise<PersistedTrackingState | null> {
  try {
    const raw = await AsyncStorage.getItem(TRACKING_STATE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedTrackingState;
  } catch (err) {
    console.log('TapMiles: Failed to read persisted tracking state:', err);
    return null;
  }
}

export async function persistState(state: PersistedTrackingState): Promise<void> {
  try {
    await AsyncStorage.setItem(TRACKING_STATE_KEY, JSON.stringify(state));
  } catch (err) {
    console.log('TapMiles: Failed to persist tracking state:', err);
  }
}

export async function clearPersistedState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(TRACKING_STATE_KEY);
  } catch (err) {
    console.log('TapMiles: Failed to clear persisted tracking state:', err);
  }
}

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.log('TapMiles: Background location error:', error.message);
    return;
  }

  const locationData = data as { locations?: Location.LocationObject[] };
  if (!locationData.locations || locationData.locations.length === 0) return;

  console.log('TapMiles: Background received', locationData.locations.length, 'locations');

  const state = await getPersistedState();
  if (!state || !state.isTracking) return;

  let { distance, routePoints, lastPoint } = state;

  for (const loc of locationData.locations) {
    const point: RoutePoint = {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      timestamp: loc.timestamp,
      speed: loc.coords.speed ?? 0,
      accuracy: loc.coords.accuracy ?? 999,
    };

    if (point.accuracy > 50) continue;

    if (lastPoint) {
      const d = haversineDistance(
        lastPoint.latitude,
        lastPoint.longitude,
        point.latitude,
        point.longitude
      );
      if (d > 0.001 && d < 0.5) {
        distance += d;
      }
    }

    lastPoint = point;

    if (routePoints.length < 5000) {
      routePoints.push(point);
    }
  }

  await persistState({
    ...state,
    distance,
    routePoints,
    lastPoint,
  });
});
