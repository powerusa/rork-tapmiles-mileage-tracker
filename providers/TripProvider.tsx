import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Trip, Project, Vehicle, AppSettings } from '@/types/trip';

const STORAGE_KEYS = {
  trips: 'tapmiles_trips',
  projects: 'tapmiles_projects',
  vehicles: 'tapmiles_vehicles',
  settings: 'tapmiles_settings',
} as const;

const DEFAULT_VEHICLE_ID = 'default_car_1';
const DEFAULT_VEHICLE = { id: DEFAULT_VEHICLE_ID, name: 'Default Auto' };

const DEFAULT_SETTINGS: AppSettings = {
  rounding: '0.1',
  lockTripsAfter24h: false,
  allowEdits: true,
  autoDetectDriving: false,
  distanceUnit: 'miles',
};

export const [TripProvider, useTrips] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([DEFAULT_VEHICLE]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(DEFAULT_VEHICLE_ID);
  const vehiclesInitialized = useRef(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const tripsQuery = useQuery({
    queryKey: ['trips'],
    queryFn: async () => {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.trips);
      return data ? (JSON.parse(data) as Trip[]) : [];
    },
  });

  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.projects);
      return data ? (JSON.parse(data) as Project[]) : [];
    },
  });

  const vehiclesQuery = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.vehicles);
      return data ? (JSON.parse(data) as Vehicle[]) : [];
    },
  });

  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.settings);
      return data ? (JSON.parse(data) as AppSettings) : DEFAULT_SETTINGS;
    },
  });

  useEffect(() => {
    if (tripsQuery.data) setTrips(tripsQuery.data);
  }, [tripsQuery.data]);

  useEffect(() => {
    if (projectsQuery.data) setProjects(projectsQuery.data);
  }, [projectsQuery.data]);

  useEffect(() => {
    if (vehiclesQuery.data) {
      let data = vehiclesQuery.data;
      if (!data.find((v) => v.id === DEFAULT_VEHICLE_ID)) {
        data = [DEFAULT_VEHICLE, ...data];
      }
      setVehicles(data);
      if (!vehiclesInitialized.current) {
        vehiclesInitialized.current = true;
        setSelectedVehicleId(DEFAULT_VEHICLE_ID);
      }
    }
  }, [vehiclesQuery.data]);

  useEffect(() => {
    if (settingsQuery.data) setSettings(settingsQuery.data);
  }, [settingsQuery.data]);

  const persistTrips = useMutation({
    mutationFn: (data: Trip[]) =>
      AsyncStorage.setItem(STORAGE_KEYS.trips, JSON.stringify(data)),
  });

  const persistProjects = useMutation({
    mutationFn: (data: Project[]) =>
      AsyncStorage.setItem(STORAGE_KEYS.projects, JSON.stringify(data)),
  });

  const persistVehicles = useMutation({
    mutationFn: (data: Vehicle[]) =>
      AsyncStorage.setItem(STORAGE_KEYS.vehicles, JSON.stringify(data)),
  });

  const persistSettings = useMutation({
    mutationFn: (data: AppSettings) =>
      AsyncStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(data)),
  });

  const addTrip = useCallback(
    (trip: Trip) => {
      const updated = [trip, ...trips];
      setTrips(updated);
      persistTrips.mutate(updated);
    },
    [trips, persistTrips]
  );

  const updateTrip = useCallback(
    (id: string, updates: Partial<Trip>) => {
      const updated = trips.map((t) => (t.id === id ? { ...t, ...updates } : t));
      setTrips(updated);
      persistTrips.mutate(updated);
    },
    [trips, persistTrips]
  );

  const deleteTrip = useCallback(
    (id: string) => {
      const updated = trips.filter((t) => t.id !== id);
      setTrips(updated);
      persistTrips.mutate(updated);
    },
    [trips, persistTrips]
  );

  const addProject = useCallback(
    (name: string) => {
      const project: Project = { id: Date.now().toString(), name };
      const updated = [...projects, project];
      setProjects(updated);
      persistProjects.mutate(updated);
      return project;
    },
    [projects, persistProjects]
  );

  const deleteProject = useCallback(
    (id: string) => {
      const updated = projects.filter((p) => p.id !== id);
      setProjects(updated);
      persistProjects.mutate(updated);
    },
    [projects, persistProjects]
  );

  const addVehicle = useCallback(
    (name: string) => {
      const vehicle: Vehicle = { id: Date.now().toString(), name };
      const updated = [...vehicles, vehicle];
      setVehicles(updated);
      persistVehicles.mutate(updated);
      return vehicle;
    },
    [vehicles, persistVehicles]
  );

  const updateVehicle = useCallback(
    (id: string, name: string) => {
      const updated = vehicles.map((v) => (v.id === id ? { ...v, name } : v));
      setVehicles(updated);
      persistVehicles.mutate(updated);
    },
    [vehicles, persistVehicles]
  );

  const deleteVehicle = useCallback(
    (id: string) => {
      if (id === DEFAULT_VEHICLE_ID) return;
      const updated = vehicles.filter((v) => v.id !== id);
      setVehicles(updated);
      persistVehicles.mutate(updated);
      if (selectedVehicleId === id) {
        setSelectedVehicleId(DEFAULT_VEHICLE_ID);
      }
    },
    [vehicles, persistVehicles, selectedVehicleId]
  );

  const updateSettings = useCallback(
    (updates: Partial<AppSettings>) => {
      const updated = { ...settings, ...updates };
      setSettings(updated);
      persistSettings.mutate(updated);
    },
    [settings, persistSettings]
  );

  const getProjectName = useCallback(
    (id: string | null) => {
      if (!id) return null;
      return projects.find((p) => p.id === id)?.name ?? null;
    },
    [projects]
  );

  const getVehicleName = useCallback(
    (id: string | null) => {
      if (!id) return null;
      return vehicles.find((v) => v.id === id)?.name ?? null;
    },
    [vehicles]
  );

  const isLoading =
    tripsQuery.isLoading || projectsQuery.isLoading || vehiclesQuery.isLoading;

  const refetchAll = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['trips'] });
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      await queryClient.invalidateQueries({ queryKey: ['settings'] });
    } catch (err) {
      console.log('TapMiles: Refetch error:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient]);

  return {
    trips,
    projects,
    vehicles,
    settings,
    isLoading,
    addTrip,
    updateTrip,
    deleteTrip,
    addProject,
    deleteProject,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    updateSettings,
    getProjectName,
    getVehicleName,
    selectedVehicleId,
    setSelectedVehicleId,
    defaultVehicleId: DEFAULT_VEHICLE_ID,
    refetchAll,
    isRefreshing,
  };
});
