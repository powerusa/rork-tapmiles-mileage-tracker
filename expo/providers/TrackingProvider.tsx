import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Platform, AppState, AppStateStatus, Alert, Linking } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { RoutePoint, TripDraft } from '@/types/trip';
import { haversineDistance, metersPerSecondToMph } from '@/utils/location';
import {
  BACKGROUND_LOCATION_TASK,
  getPersistedState,
  persistState,
  clearPersistedState,
  PersistedTrackingState,
} from '@/utils/backgroundLocation';

export type GpsStatus = 'off' | 'searching' | 'active' | 'poor';

export const [TrackingProvider, useTracking] = createContextHook(() => {
  const [isTracking, setIsTracking] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [distance, setDistance] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('off');
  const [pendingTrip, setPendingTrip] = useState<TripDraft | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  const routePointsRef = useRef<RoutePoint[]>([]);
  const lastPointRef = useRef<RoutePoint | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const webWatchRef = useRef<number | null>(null);
  const distanceRef = useRef(0);

  const syncFromPersistedState = useCallback(async () => {
    const saved = await getPersistedState();
    if (saved && saved.isTracking) {
      console.log('TapMiles: Restoring tracking session from background');
      startTimeRef.current = saved.startTime;
      distanceRef.current = saved.distance;
      routePointsRef.current = saved.routePoints;
      lastPointRef.current = saved.lastPoint;
      setDistance(saved.distance);
      setIsTracking(true);
      setGpsStatus('active');
      setElapsedTime(Math.floor((Date.now() - saved.startTime) / 1000));
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    const restore = async () => {
      if (Platform.OS === 'web') {
        setIsRestoring(false);
        return;
      }
      const restored = await syncFromPersistedState();
      if (restored) {
        startTimer();
        startForegroundWatch();
      }
      setIsRestoring(false);
    };
    restore();
  }, []);

  useEffect(() => {
    const handleAppState = async (nextState: AppStateStatus) => {
      if (nextState === 'active' && Platform.OS !== 'web') {
        const saved = await getPersistedState();
        if (saved && saved.isTracking) {
          console.log('TapMiles: App foregrounded, syncing persisted state');
          distanceRef.current = saved.distance;
          routePointsRef.current = saved.routePoints;
          lastPointRef.current = saved.lastPoint;
          setDistance(saved.distance);
          setElapsedTime(Math.floor((Date.now() - saved.startTime) / 1000));
        }
      }
    };

    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, []);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (startTimeRef.current > 0) {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 1000);
  }, []);

  const startForegroundWatch = useCallback(async () => {
    if (Platform.OS === 'web') return;
    try {
      if (locationSubRef.current) {
        locationSubRef.current.remove();
        locationSubRef.current = null;
      }
      locationSubRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 10,
          timeInterval: 5000,
        },
        (location) => {
          const point: RoutePoint = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: location.timestamp,
            speed: location.coords.speed ?? 0,
            accuracy: location.coords.accuracy ?? 999,
          };

          if (point.accuracy > 50) {
            setGpsStatus('poor');
            return;
          }

          setGpsStatus('active');
          const speedMph = Math.max(0, metersPerSecondToMph(point.speed));
          setCurrentSpeed(speedMph);

          if (lastPointRef.current) {
            const d = haversineDistance(
              lastPointRef.current.latitude,
              lastPointRef.current.longitude,
              point.latitude,
              point.longitude
            );
            if (d > 0.001 && d < 0.5) {
              distanceRef.current += d;
              setDistance(distanceRef.current);
            }
          }

          lastPointRef.current = point;
          routePointsRef.current.push(point);

          persistState({
            isTracking: true,
            startTime: startTimeRef.current,
            distance: distanceRef.current,
            routePoints: routePointsRef.current.slice(-5000),
            lastPoint: point,
          });
        }
      );
    } catch (err) {
      console.log('TapMiles: Foreground location watch error:', err);
      setGpsStatus('poor');
    }
  }, []);

  const startBackgroundLocation = useCallback(async () => {
    if (Platform.OS === 'web') return;
    try {
      const bgPermission = await Location.requestBackgroundPermissionsAsync();
      if (bgPermission.status !== 'granted') {
        console.log('TapMiles: Background location permission denied, foreground-only tracking');
        return;
      }

      const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => false);
      if (isRunning) {
        console.log('TapMiles: Background location already running');
        return;
      }

      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 10,
        deferredUpdatesInterval: 5000,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'TapMiles',
          notificationBody: 'Recording your trip in the background...',
          notificationColor: '#00D68F',
        },
        activityType: Location.ActivityType.AutomotiveNavigation,
        pausesUpdatesAutomatically: false,
      });
      console.log('TapMiles: Background location started');
    } catch (err) {
      console.log('TapMiles: Failed to start background location:', err);
    }
  }, []);

  const stopBackgroundLocation = useCallback(async () => {
    if (Platform.OS === 'web') return;
    try {
      const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => false);
      if (isRunning) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        console.log('TapMiles: Background location stopped');
      }
    } catch (err) {
      console.log('TapMiles: Failed to stop background location:', err);
    }
  }, []);

  const startTracking = useCallback(async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('TapMiles: Location permission denied');
          Alert.alert(
            'Location Permission Required',
            'TapMiles needs location access to track your drive. Please enable location permissions in Settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]
          );
          return false;
        }
      }

      routePointsRef.current = [];
      lastPointRef.current = null;
      distanceRef.current = 0;
      startTimeRef.current = Date.now();
      setDistance(0);
      setElapsedTime(0);
      setCurrentSpeed(0);
      setGpsStatus('searching');
      setIsTracking(true);
      setPendingTrip(null);

      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch (_) {}

      await persistState({
        isTracking: true,
        startTime: startTimeRef.current,
        distance: 0,
        routePoints: [],
        lastPoint: null,
      });

      startTimer();

      if (Platform.OS !== 'web') {
        await startForegroundWatch();
        await startBackgroundLocation();
      } else {
        setGpsStatus('active');
        if ('geolocation' in navigator) {
          webWatchRef.current = navigator.geolocation.watchPosition(
            (position) => {
              const point: RoutePoint = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                timestamp: position.timestamp,
                speed: position.coords.speed ?? 0,
                accuracy: position.coords.accuracy ?? 999,
              };

              if (point.accuracy > 100) return;

              setGpsStatus('active');
              const speedMph = Math.max(0, metersPerSecondToMph(point.speed));
              setCurrentSpeed(speedMph);

              if (lastPointRef.current) {
                const d = haversineDistance(
                  lastPointRef.current.latitude,
                  lastPointRef.current.longitude,
                  point.latitude,
                  point.longitude
                );
                if (d > 0.001 && d < 0.5) {
                  distanceRef.current += d;
                  setDistance(distanceRef.current);
                }
              }

              lastPointRef.current = point;
              routePointsRef.current.push(point);
            },
            (err) => {
              console.log('TapMiles: Web geolocation error:', err);
            },
            { enableHighAccuracy: true, maximumAge: 5000 }
          );
        }
      }

      return true;
    } catch (err) {
      console.log('TapMiles: startTracking error:', err);
      setIsTracking(false);
      setGpsStatus('off');
      Alert.alert('Unable to Start', 'An error occurred while starting the trip. Please try again.');
      return false;
    }
  }, [startTimer, startForegroundWatch, startBackgroundLocation]);

  const stopTracking = useCallback(async () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch (_) {}

    if (Platform.OS !== 'web') {
      const saved = await getPersistedState();
      if (saved && saved.isTracking) {
        distanceRef.current = saved.distance;
        routePointsRef.current = saved.routePoints;
        lastPointRef.current = saved.lastPoint;
      }
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (locationSubRef.current) {
      locationSubRef.current.remove();
      locationSubRef.current = null;
    }

    if (webWatchRef.current !== null && Platform.OS === 'web' && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(webWatchRef.current);
      webWatchRef.current = null;
    }

    await stopBackgroundLocation();
    await clearPersistedState();

    const endTime = Date.now();
    const duration = Math.floor((endTime - startTimeRef.current) / 1000);

    const draft: TripDraft = {
      startTime: startTimeRef.current,
      endTime,
      distance: distanceRef.current,
      duration,
      routePoints: [...routePointsRef.current],
    };

    setPendingTrip(draft);
    setIsTracking(false);
    setGpsStatus('off');
    setCurrentSpeed(0);

    console.log('TapMiles: Trip stopped. Distance:', distanceRef.current, 'Duration:', duration);

    return draft;
  }, [stopBackgroundLocation]);

  const clearPendingTrip = useCallback(() => {
    setPendingTrip(null);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (locationSubRef.current) locationSubRef.current.remove();
      if (webWatchRef.current !== null && Platform.OS === 'web' && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(webWatchRef.current);
      }
    };
  }, []);

  return {
    isTracking,
    isRestoring,
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
