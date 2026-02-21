import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Filter, Route } from 'lucide-react-native';
import { useTrips } from '@/providers/TripProvider';
import { useI18n } from '@/providers/I18nProvider';
import { TripCard } from '@/components/TripCard';
import { Colors } from '@/constants/colors';
import { TripPurpose } from '@/types/trip';

export default function TripsScreen() {
  const router = useRouter();
  const { trips, settings, getProjectName, getVehicleName } = useTrips();
  const { t } = useI18n();
  const [activeFilter, setActiveFilter] = useState<TripPurpose | 'all'>('all');

  const filterOptions: { key: TripPurpose | 'all'; label: string }[] = useMemo(() => [
    { key: 'all', label: t.all },
    { key: 'business', label: t.business },
    { key: 'personal', label: t.personal },
    { key: 'medical', label: t.medical },
    { key: 'charity', label: t.charity },
  ], [t]);

  const filteredTrips = useMemo(() => {
    if (activeFilter === 'all') return trips;
    return trips.filter((tr) => tr.purpose === activeFilter);
  }, [trips, activeFilter]);

  const totalDistance = useMemo(
    () => filteredTrips.reduce((sum, tr) => sum + tr.distance, 0),
    [filteredTrips]
  );

  const handleTripPress = useCallback(
    (id: string) => {
      router.push({ pathname: '/trip-detail', params: { id } } as any);
    },
    [router]
  );

  return (
    <View style={styles.container}>
      <View style={styles.filterBar}>
        {filterOptions.map((opt) => {
          const isActive = activeFilter === opt.key;
          const color =
            opt.key !== 'all' ? Colors.purposes[opt.key] : Colors.accent;
          return (
            <Pressable
              key={opt.key}
              style={[
                styles.filterChip,
                isActive && { backgroundColor: color + '20', borderColor: color },
              ]}
              onPress={() => setActiveFilter(opt.key)}
            >
              <Text
                style={[
                  styles.filterText,
                  isActive && { color },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {filteredTrips.length > 0 && (
        <View style={styles.summaryBar}>
          <Text style={styles.summaryText}>
            {filteredTrips.length} {filteredTrips.length !== 1 ? t.trips : t.trip}
          </Text>
          <Text style={styles.summaryDistance}>
            {totalDistance.toFixed(1)} {t.mi} {t.total}
          </Text>
        </View>
      )}

      <FlatList
        data={filteredTrips}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TripCard
            trip={item}
            rounding={settings.rounding}
            projectName={getProjectName(item.projectId)}
            vehicleName={getVehicleName(item.vehicleId)}
            onPress={() => handleTripPress(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Route size={40} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>{t.noTrips}</Text>
            <Text style={styles.emptySubtitle}>
              {activeFilter !== 'all'
                ? t.noTripsForPurpose.replace('{{purpose}}', filterOptions.find(o => o.key === activeFilter)?.label ?? activeFilter)
                : t.startTrackingFirst}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  summaryText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500' as const,
  },
  summaryDistance: {
    fontSize: 13,
    color: Colors.accent,
    fontWeight: '600' as const,
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center' as const,
    paddingHorizontal: 40,
    lineHeight: 20,
  },
});
