import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';
import { Trip, Project, Vehicle, AppSettings } from '@/types/trip';
import { writeStoredValue, storageTransaction } from '@/utils/storage';
import { createId, tripSchema, namedItemSchema, settingsSchema } from '@/utils/validation';

const DEFAULT_VEHICLE_ID = 'default_car_1';
const DEFAULT_VEHICLE = { id: DEFAULT_VEHICLE_ID, name: 'Default Auto' };
const DEFAULT_SETTINGS: AppSettings = settingsSchema.parse({});

function useStoredState<T>(key: string, initial: T, parse: (value: unknown) => T) {
  const [value, setValue] = useState(initial);
  const current = useRef(initial);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const parser = useRef(parse);
  const dirty = useRef(false);
  const revision = useRef(0);
  const load = useCallback(async () => {
    const atRevision = revision.current;
    try {
      const next = await storageTransaction(key, async () => {
        const raw = await AsyncStorage.getItem(key);
        return raw === null ? current.current : parser.current(JSON.parse(raw));
      });
      if (revision.current !== atRevision) return;
      current.current = next;
      setValue(next);
      setLoaded(true);
      setError(null);
    } catch (err) {
      setError(err);
    }
  }, [key]);
  useEffect(() => {
    void load();
  }, [load]);
  const update = useCallback(
    (transform: (previous: T) => T) => {
      if (!loaded) return Promise.reject(new Error('Data is still loading.'));
      const next = transform(current.current);
      current.current = next;
      revision.current += 1;
      dirty.current = true;
      setValue(next);
      return writeStoredValue(key, next)
        .then(() => {
          if (current.current === next) {
            dirty.current = false;
            setError(null);
          }
        })
        .catch((err) => {
          setError(err);
          throw err;
        });
    },
    [key, loaded],
  );
  const refresh = useCallback(async () => {
    if (dirty.current) {
      const snapshot = current.current;
      await writeStoredValue(key, snapshot);
      if (current.current !== snapshot) return;
      dirty.current = false;
    }
    await load();
  }, [key, load]);
  return { value, current, loaded, error, update, refresh };
}

export const [TripProvider, useTrips] = createContextHook(() => {
  const tripStore = useStoredState<Trip[]>('tapmiles_trips', [], (value) =>
    z
      .array(tripSchema)
      .parse(value)
      .sort((a, b) => b.startTime - a.startTime),
  );
  const projectStore = useStoredState<Project[]>('tapmiles_projects', [], (value) =>
    z.array(namedItemSchema).parse(value),
  );
  const vehicleStore = useStoredState<Vehicle[]>(
    'tapmiles_vehicles',
    [DEFAULT_VEHICLE],
    (value) => {
      const items = z.array(namedItemSchema).parse(value);
      return items.some((item) => item.id === DEFAULT_VEHICLE_ID)
        ? items
        : [DEFAULT_VEHICLE, ...items];
    },
  );
  const settingStore = useStoredState<AppSettings>('tapmiles_settings', DEFAULT_SETTINGS, (value) =>
    settingsSchema.parse(value),
  );
  const selectedStore = useStoredState<string>(
    'tapmiles_selected_vehicle',
    DEFAULT_VEHICLE_ID,
    (value) => z.string().parse(value),
  );
  const selectedVehicleId = vehicleStore.value.some((vehicle) => vehicle.id === selectedStore.value)
    ? selectedStore.value
    : DEFAULT_VEHICLE_ID;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { value: trips } = tripStore;
  const { value: projects } = projectStore;
  const { value: vehicles } = vehicleStore;
  const { value: settings } = settingStore;
  const reportFailure = (error: unknown) => {
    console.error('TapMiles: Storage error', error);
    Alert.alert(
      'Unable to save changes',
      'Your changes have not been saved to this device. Please retry using refresh before closing TapMiles.',
    );
  };
  const backgroundSave = (promise: Promise<void>) => {
    void promise.catch(reportFailure);
  };
  const setSelectedVehicleId = (id: string) => {
    if (vehicleStore.current.current.some((vehicle) => vehicle.id === id))
      backgroundSave(selectedStore.update(() => id));
  };
  const canModifyTrip = (trip: Trip) =>
    settings.allowEdits && (!settings.lockTripsAfter24h || Date.now() - trip.endTime < 86400000);
  const addTrip = async (trip: Trip) => {
    const valid = tripSchema.parse(trip);
    await tripStore.update((items) =>
      [valid, ...items.filter((item) => item.id !== valid.id)].sort(
        (a, b) => b.startTime - a.startTime,
      ),
    );
  };
  const updateTrip = async (id: string, updates: Partial<Trip>) => {
    await tripStore.update((items) =>
      items.map((trip) => {
        if (trip.id !== id) return trip;
        if (!canModifyTrip(trip)) throw new Error('This trip is locked.');
        return tripSchema.parse({ ...trip, ...updates, id });
      }),
    );
  };
  const deleteTrip = async (id: string) => {
    await tripStore.update((items) =>
      items.filter((trip) => trip.id !== id || !canModifyTrip(trip)),
    );
  };
  const addProject = (name: string) => {
    const project = namedItemSchema.parse({ id: createId(), name: name.trim() });
    backgroundSave(projectStore.update((items) => [...items, project]));
    return project;
  };
  const deleteProject = (id: string) =>
    backgroundSave(projectStore.update((items) => items.filter((item) => item.id !== id)));
  const addVehicle = (name: string) => {
    const vehicle = namedItemSchema.parse({ id: createId(), name: name.trim() });
    backgroundSave(vehicleStore.update((items) => [...items, vehicle]));
    return vehicle;
  };
  const updateVehicle = (id: string, name: string) =>
    backgroundSave(
      vehicleStore.update((items) =>
        items.map((item) =>
          item.id === id ? namedItemSchema.parse({ id, name: name.trim() }) : item,
        ),
      ),
    );
  const deleteVehicle = (id: string) => {
    if (id === DEFAULT_VEHICLE_ID) return;
    backgroundSave(vehicleStore.update((items) => items.filter((item) => item.id !== id)));
    if (selectedVehicleId === id) setSelectedVehicleId(DEFAULT_VEHICLE_ID);
  };
  const updateSettings = (updates: Partial<AppSettings>) =>
    backgroundSave(
      settingStore.update((previous) => settingsSchema.parse({ ...previous, ...updates })),
    );
  const refetchAll = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        tripStore.refresh(),
        projectStore.refresh(),
        vehicleStore.refresh(),
        settingStore.refresh(),
        selectedStore.refresh(),
      ]);
    } catch (error) {
      reportFailure(error);
    } finally {
      setIsRefreshing(false);
    }
  };
  return {
    trips,
    projects,
    vehicles,
    settings,
    selectedVehicleId,
    setSelectedVehicleId,
    isLoading:
      !tripStore.loaded ||
      !projectStore.loaded ||
      !vehicleStore.loaded ||
      !settingStore.loaded ||
      !selectedStore.loaded,
    storageError:
      tripStore.error ||
      projectStore.error ||
      vehicleStore.error ||
      settingStore.error ||
      selectedStore.error,
    addTrip,
    updateTrip,
    deleteTrip,
    addProject,
    deleteProject,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    updateSettings,
    canModifyTrip,
    defaultVehicleId: DEFAULT_VEHICLE_ID,
    refetchAll,
    isRefreshing,
    getProjectName: (id: string | null) => projects.find((item) => item.id === id)?.name ?? null,
    getVehicleName: (id: string | null) => vehicles.find((item) => item.id === id)?.name ?? null,
  };
});
