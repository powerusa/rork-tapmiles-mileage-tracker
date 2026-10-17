import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as TaskManager from 'expo-task-manager';
import { z } from 'zod';
import type { RoutePoint } from '@/types/trip';
import { draftSchema, routePointSchema } from '@/utils/validation';
import { appendLocations, PersistedTrackingState } from '@/utils/tracking';
import { storageTransaction } from '@/utils/storage';
export type { PersistedTrackingState } from '@/utils/tracking';

export const BACKGROUND_LOCATION_TASK = 'TAPMILES_BACKGROUND_LOCATION';
export const TRACKING_STATE_KEY = '@tapmiles_tracking_state';
const schema = z.object({
  isTracking: z.boolean(),
  startTime: z.number().finite().positive(),
  distance: z.number().finite().nonnegative(),
  routePoints: z.array(routePointSchema),
  lastPoint: routePointSchema.nullable(),
  pendingTrip: draftSchema.nullable().optional(),
});
async function readState(): Promise<PersistedTrackingState | null> {
  const raw = await AsyncStorage.getItem(TRACKING_STATE_KEY);
  return raw ? schema.parse(JSON.parse(raw)) : null;
}
export function getPersistedState() {
  return storageTransaction(TRACKING_STATE_KEY, readState);
}
export function changeTrackingState(
  update: (state: PersistedTrackingState | null) => PersistedTrackingState | null,
) {
  return storageTransaction(TRACKING_STATE_KEY, async () => {
    const state = update(await readState());
    if (state) await AsyncStorage.setItem(TRACKING_STATE_KEY, JSON.stringify(schema.parse(state)));
    else await AsyncStorage.removeItem(TRACKING_STATE_KEY);
    return state;
  });
}
export const persistState = (state: PersistedTrackingState) => changeTrackingState(() => state);
export const clearPersistedState = () => changeTrackingState(() => null);
export const recordLocations = (points: RoutePoint[]) =>
  changeTrackingState((state) => (state ? appendLocations(state, points) : null));

if (Platform.OS !== 'web' && !TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK)) {
  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
      console.error('TapMiles: Background location error', error.message);
      return;
    }
    const payload = data as {
      locations?: {
        coords: {
          latitude: number;
          longitude: number;
          speed: number | null;
          accuracy: number | null;
        };
        timestamp: number;
      }[];
    } | null;
    if (!payload?.locations?.length) return;
    try {
      await recordLocations(
        payload.locations.map((location) => ({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: location.timestamp,
          speed: location.coords.speed ?? 0,
          accuracy: location.coords.accuracy ?? 999,
        })),
      );
    } catch (err) {
      console.error('TapMiles: Background recording failed', err);
    }
  });
}
