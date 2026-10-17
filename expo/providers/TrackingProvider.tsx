import { useState, useRef, useCallback, useEffect } from 'react';
import { Platform, AppState, Alert, Linking } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import type { RoutePoint, TripDraft } from '@/types/trip';
import { metersPerSecondToMph } from '@/utils/location';
import {
  BACKGROUND_LOCATION_TASK,
  getPersistedState,
  persistState,
  changeTrackingState,
  clearPersistedState,
  recordLocations,
  PersistedTrackingState,
} from '@/utils/backgroundLocation';
export type GpsStatus = 'off' | 'searching' | 'active' | 'poor';
const disclosure = () =>
  new Promise<boolean>((resolve) =>
    Alert.alert(
      'Location access for trip tracking',
      'TapMiles records location to calculate your mileage while a drive is active, including in the background. Tracking starts when you tap START DRIVE and stops when you tap STOP & SAVE. A notification remains visible while recording.',
      [
        { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Continue', onPress: () => resolve(true) },
      ],
      { cancelable: false },
    ),
  );

export const [TrackingProvider, useTracking] = createContextHook(() => {
  const [isTracking, setIsTracking] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [distance, setDistance] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('off');
  const [pendingTrip, setPendingTrip] = useState<TripDraft | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [trackingError, setTrackingError] = useState<unknown>(null);
  const stateRef = useRef<PersistedTrackingState | null>(null);
  const busyRef = useRef(false);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const webWatchRef = useRef<number | null>(null);
  const mounted = useRef(true);
  const applyState = useCallback((state: PersistedTrackingState | null) => {
    if (!mounted.current) return;
    stateRef.current = state;
    setIsTracking(state?.isTracking ?? false);
    setDistance(state?.distance ?? 0);
    setPendingTrip(state?.pendingTrip ?? null);
    setElapsedTime(state ? Math.max(0, Math.floor((Date.now() - state.startTime) / 1000)) : 0);
  }, []);
  const removeWatch = useCallback(() => {
    watchRef.current?.remove();
    watchRef.current = null;
    if (webWatchRef.current !== null && Platform.OS === 'web') {
      navigator.geolocation.clearWatch(webWatchRef.current);
      webWatchRef.current = null;
    }
  }, []);
  const onLocation = useCallback(
    async (point: RoutePoint) => {
      const session = stateRef.current?.startTime;
      if (!stateRef.current?.isTracking || busyRef.current) return;
      setGpsStatus(point.accuracy > 50 ? 'poor' : 'active');
      setCurrentSpeed(Math.max(0, metersPerSecondToMph(point.speed)));
      try {
        const state = await recordLocations([point]);
        if (!busyRef.current && state?.isTracking && state.startTime === session) applyState(state);
      } catch (error) {
        setTrackingError(error);
        setGpsStatus('poor');
      }
    },
    [applyState],
  );
  const startWatch = useCallback(async () => {
    removeWatch();
    if (Platform.OS === 'web') {
      if (!navigator.geolocation) throw new Error('Geolocation is unavailable in this browser.');
      webWatchRef.current = navigator.geolocation.watchPosition(
        (position) => {
          void onLocation({
            ...position.coords,
            timestamp: position.timestamp,
            speed: position.coords.speed ?? 0,
            accuracy: position.coords.accuracy ?? 999,
          });
        },
        () => setGpsStatus('poor'),
        { enableHighAccuracy: true, maximumAge: 0 },
      );
      return;
    }
    const subscription = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 10, timeInterval: 5000 },
      (location) => {
        void onLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: location.timestamp,
          speed: location.coords.speed ?? 0,
          accuracy: location.coords.accuracy ?? 999,
        });
      },
      () => setGpsStatus('poor'),
    );
    if (!mounted.current || !stateRef.current?.isTracking) subscription.remove();
    else watchRef.current = subscription;
  }, [removeWatch, onLocation]);
  const stopBackground = useCallback(async () => {
    if (
      Platform.OS !== 'web' &&
      (await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK))
    )
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }, []);
  const restore = useCallback(async () => {
    setIsRestoring(true);
    try {
      const state = await getPersistedState();
      applyState(state);
      if (state?.isTracking) {
        setGpsStatus('searching');
        await startWatch();
      }
      setTrackingError(null);
    } catch (error) {
      setTrackingError(error);
    } finally {
      setIsRestoring(false);
    }
  }, [applyState, startWatch]);
  useEffect(() => {
    mounted.current = true;
    void restore();
    const timer = setInterval(() => {
      if (stateRef.current?.isTracking)
        setElapsedTime(Math.max(0, Math.floor((Date.now() - stateRef.current.startTime) / 1000)));
    }, 1000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !busyRef.current)
        void getPersistedState()
          .then((saved) => {
            if (!busyRef.current) applyState(saved);
          })
          .catch(setTrackingError);
    });
    return () => {
      mounted.current = false;
      clearInterval(timer);
      removeWatch();
      subscription.remove();
    };
  }, [restore, applyState, removeWatch]);
  const startTracking = useCallback(async () => {
    if (
      busyRef.current ||
      isRestoring ||
      stateRef.current?.isTracking ||
      stateRef.current?.pendingTrip
    )
      return false;
    busyRef.current = true;
    setIsBusy(true);
    try {
      if (Platform.OS !== 'web') {
        if (
          Platform.OS === 'android' &&
          (await Location.getBackgroundPermissionsAsync()).status !== 'granted' &&
          !(await disclosure())
        )
          return false;
        if ((await Location.requestForegroundPermissionsAsync()).status !== 'granted') {
          Alert.alert(
            'Location Permission Required',
            'Enable location access in Settings to track a drive.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Open Settings',
                onPress: () => {
                  void Linking.openSettings();
                },
              },
            ],
          );
          return false;
        }
        if (!(await Location.hasServicesEnabledAsync()))
          throw new Error('Location services are disabled.');
      }
      const state: PersistedTrackingState = {
        isTracking: true,
        startTime: Date.now(),
        distance: 0,
        routePoints: [],
        lastPoint: null,
        pendingTrip: null,
      };
      await persistState(state);
      applyState(state);
      setGpsStatus('searching');
      await startWatch();
      if (Platform.OS !== 'web') {
        try {
          if ((await Location.requestBackgroundPermissionsAsync()).status === 'granted') {
            if (!(await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)))
              await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
                accuracy: Location.Accuracy.BestForNavigation,
                distanceInterval: 10,
                deferredUpdatesInterval: 5000,
                showsBackgroundLocationIndicator: true,
                activityType: Location.ActivityType.AutomotiveNavigation,
                pausesUpdatesAutomatically: false,
                foregroundService: {
                  notificationTitle: 'TapMiles',
                  notificationBody: 'Recording your trip in the background...',
                  notificationColor: '#00D68F',
                },
              });
          } else
            Alert.alert(
              'Foreground tracking only',
              'Keep TapMiles open to record this drive. Background location permission has not been granted.',
            );
        } catch {
          Alert.alert(
            'Foreground tracking only',
            'Background tracking could not start. Keep TapMiles open to record this drive.',
          );
        }
      }
      setTrackingError(null);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => undefined);
      return true;
    } catch (error) {
      removeWatch();
      await stopBackground().catch(() => undefined);
      await clearPersistedState().catch(setTrackingError);
      applyState(null);
      setGpsStatus('off');
      Alert.alert('Unable to Start', error instanceof Error ? error.message : 'Please try again.');
      return false;
    } finally {
      busyRef.current = false;
      setIsBusy(false);
    }
  }, [isRestoring, applyState, startWatch, removeWatch, stopBackground]);
  const stopTracking = useCallback(async () => {
    if (busyRef.current || !stateRef.current?.isTracking) return null;
    busyRef.current = true;
    setIsBusy(true);
    try {
      removeWatch();
      await stopBackground();
      const state = await changeTrackingState((saved) => {
        if (!saved?.isTracking) return saved;
        const endTime = Date.now();
        return {
          ...saved,
          isTracking: false,
          pendingTrip: {
            startTime: saved.startTime,
            endTime,
            distance: saved.distance,
            duration: Math.max(0, Math.floor((endTime - saved.startTime) / 1000)),
            routePoints: saved.routePoints,
          },
        };
      });
      applyState(state);
      setGpsStatus('off');
      setCurrentSpeed(0);
      setTrackingError(null);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => undefined);
      return state?.pendingTrip ?? null;
    } catch (error) {
      setTrackingError(error);
      await startWatch().catch(() => undefined);
      throw error;
    } finally {
      busyRef.current = false;
      setIsBusy(false);
    }
  }, [applyState, removeWatch, startWatch, stopBackground]);
  const clearPendingTrip = useCallback(async () => {
    await clearPersistedState();
    applyState(null);
  }, [applyState]);
  return {
    isTracking,
    isRestoring,
    isBusy,
    trackingError,
    restore,
    elapsedTime,
    distance,
    currentSpeed,
    gpsStatus,
    pendingTrip,
    startTracking,
    stopTracking,
    clearPendingTrip,
  };
});
