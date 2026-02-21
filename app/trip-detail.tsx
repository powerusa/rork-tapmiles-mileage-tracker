import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Navigation, Clock, Gauge, Calendar, Trash2, MapPin } from 'lucide-react-native';
import { useTrips } from '@/providers/TripProvider';
import { useI18n } from '@/providers/I18nProvider';
import { Colors } from '@/constants/colors';
import { formatDistance, formatDuration, formatDate, formatTime, formatDurationLong } from '@/utils/format';

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { trips, deleteTrip, getProjectName, getVehicleName, settings } = useTrips();
  const { t } = useI18n();

  const trip = useMemo(() => trips.find((tr) => tr.id === id), [trips, id]);

  const handleDelete = () => {
    Alert.alert(t.deleteTrip, t.deleteTripMsg, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.delete,
        style: 'destructive',
        onPress: () => {
          if (trip) {
            deleteTrip(trip.id);
            router.back();
          }
        },
      },
    ]);
  };

  const purposeLabel = useMemo(() => {
    if (!trip) return '';
    const key = trip.purpose as keyof typeof t;
    return t[key] ?? trip.purpose.charAt(0).toUpperCase() + trip.purpose.slice(1);
  }, [trip, t]);

  if (!trip) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: t.trip }} />
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{t.tripNotFound}</Text>
        </View>
      </View>
    );
  }

  const purposeColor = Colors.purposes[trip.purpose] ?? Colors.textSecondary;
  const projectName = getProjectName(trip.projectId);
  const vehicleName = getVehicleName(trip.vehicleId);
  const avgSpeed =
    trip.duration > 0 ? (trip.distance / (trip.duration / 3600)).toFixed(1) : '0';

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: formatDate(trip.startTime),
          headerRight: () => (
            <Pressable onPress={handleDelete} hitSlop={8}>
              <Trash2 size={20} color={Colors.danger} />
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View
            style={[
              styles.purposeBadge,
              { backgroundColor: purposeColor + '20' },
            ]}
          >
            <Text style={[styles.purposeText, { color: purposeColor }]}>
              {purposeLabel}
            </Text>
          </View>
          <Text style={styles.heroDistance}>
            {formatDistance(trip.distance, settings.rounding)}
          </Text>
          <Text style={styles.heroUnit}>{t.miles}</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Clock size={18} color={Colors.accent} />
            <Text style={styles.statValue}>{formatDuration(trip.duration)}</Text>
            <Text style={styles.statLabel}>{t.duration}</Text>
          </View>
          <View style={styles.statCard}>
            <Gauge size={18} color={Colors.accent} />
            <Text style={styles.statValue}>{avgSpeed}</Text>
            <Text style={styles.statLabel}>{t.avgMph}</Text>
          </View>
          <View style={styles.statCard}>
            <MapPin size={18} color={Colors.accent} />
            <Text style={styles.statValue}>{trip.routePoints.length}</Text>
            <Text style={styles.statLabel}>{t.gpsPoints}</Text>
          </View>
        </View>

        <View style={styles.detailsSection}>
          <View style={styles.detailRow}>
            <Calendar size={16} color={Colors.textSecondary} />
            <Text style={styles.detailLabel}>{t.date}</Text>
            <Text style={styles.detailValue}>
              {formatDate(trip.startTime)}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <Clock size={16} color={Colors.textSecondary} />
            <Text style={styles.detailLabel}>{t.time}</Text>
            <Text style={styles.detailValue}>
              {formatTime(trip.startTime)} – {formatTime(trip.endTime)}
            </Text>
          </View>

          {projectName && (
            <>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Navigation size={16} color={Colors.textSecondary} />
                <Text style={styles.detailLabel}>{t.project}</Text>
                <Text style={styles.detailValue}>{projectName}</Text>
              </View>
            </>
          )}

          {vehicleName && (
            <>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Navigation size={16} color={Colors.textSecondary} />
                <Text style={styles.detailLabel}>{t.vehicle}</Text>
                <Text style={styles.detailValue}>{vehicleName}</Text>
              </View>
            </>
          )}
        </View>

        {trip.notes.length > 0 && (
          <View style={styles.notesSection}>
            <Text style={styles.notesSectionLabel}>{t.notes}</Text>
            <Text style={styles.notesText}>{trip.notes}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  heroCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
    gap: 4,
  },
  purposeBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 10,
    marginBottom: 12,
  },
  purposeText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  heroDistance: {
    fontSize: 56,
    fontWeight: '800' as const,
    color: Colors.text,
    lineHeight: 60,
  },
  heroUnit: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500' as const,
  },
  detailsSection: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600' as const,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  notesSection: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
  },
  notesSectionLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  notesText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
});
