import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Trip, DistanceUnit } from '@/types/trip';
import { useI18n } from '@/providers/I18nProvider';
import { Colors } from '@/constants/colors';
import { formatDistance, formatDateShort, formatTime, formatDurationLong } from '@/utils/format';

interface TripCardProps {
  trip: Trip;
  rounding: '0.1' | '0.01';
  distanceUnit?: DistanceUnit;
  projectName: string | null;
  vehicleName: string | null;
  onPress: () => void;
}

function TripCardComponent({ trip, rounding, distanceUnit = 'miles', projectName, vehicleName, onPress }: TripCardProps) {
  const purposeColor = Colors.purposes[trip.purpose] ?? Colors.textSecondary;
  const { t } = useI18n();

  const purposeLabel = t[trip.purpose as keyof typeof t] ?? trip.purpose.charAt(0).toUpperCase() + trip.purpose.slice(1);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
      testID={`trip-card-${trip.id}`}
    >
      <View style={styles.leftStripe}>
        <View style={[styles.stripe, { backgroundColor: purposeColor }]} />
      </View>
      <View style={styles.content}>
        <View style={styles.topRow}>
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
          <Text style={styles.distance}>
            {formatDistance(trip.distance, rounding, distanceUnit)} {distanceUnit === 'km' ? t.km : t.mi}
          </Text>
        </View>
        <Text style={styles.dateText}>
          {formatDateShort(trip.startTime)} {t.at} {formatTime(trip.startTime)} ·{' '}
          {formatDurationLong(trip.duration)}
        </Text>
        {(projectName || vehicleName) && (
          <View style={styles.tagsRow}>
            {projectName && (
              <Text style={styles.tag} numberOfLines={1}>
                {projectName}
              </Text>
            )}
            {vehicleName && (
              <Text style={styles.tag} numberOfLines={1}>
                {vehicleName}
              </Text>
            )}
          </View>
        )}
      </View>
      <ChevronRight size={16} color={Colors.textMuted} />
    </Pressable>
  );
}

export const TripCard = React.memo(TripCardComponent);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginBottom: 10,
  },
  cardPressed: {
    opacity: 0.7,
  },
  leftStripe: {
    width: 4,
    alignSelf: 'stretch',
  },
  stripe: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 8,
    gap: 5,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  purposeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  purposeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  distance: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  dateText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  tag: {
    fontSize: 12,
    color: Colors.textMuted,
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
});
