import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Navigation, Clock, Gauge, Radio, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTracking } from '@/providers/TrackingProvider';
import { useTrips } from '@/providers/TripProvider';
import { useI18n } from '@/providers/I18nProvider';
import { Colors } from '@/constants/colors';
import { formatDistance, formatDuration, formatSpeed, formatDateShort, formatTime, formatDurationLong } from '@/utils/format';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const {
    isTracking,
    elapsedTime,
    distance,
    currentSpeed,
    gpsStatus,
    startTracking,
    stopTracking,
  } = useTracking();
  const { trips, settings } = useTrips();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (isTracking) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.06,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      );
      const ring = Animated.loop(
        Animated.sequence([
          Animated.timing(ringAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(ringAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      ring.start();
      return () => {
        pulse.stop();
        ring.stop();
      };
    } else {
      pulseAnim.setValue(1);
      ringAnim.setValue(0);
    }
  }, [isTracking]);

  const handlePress = async () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();

    if (isTracking) {
      stopTracking();
      router.push('/save-trip' as any);
    } else {
      await startTracking();
    }
  };

  const lastTrip = trips[0];

  const gpsLabel = useMemo(() => {
    switch (gpsStatus) {
      case 'active':
        return t.gpsActive;
      case 'searching':
        return t.gpsSearching;
      case 'poor':
        return t.gpsPoor;
      default:
        return t.gpsOff;
    }
  }, [gpsStatus, t]);

  const gpsColor = useMemo(() => {
    switch (gpsStatus) {
      case 'active':
        return Colors.accent;
      case 'searching':
        return Colors.warning;
      case 'poor':
        return Colors.danger;
      default:
        return Colors.textMuted;
    }
  }, [gpsStatus]);

  const ringOpacity = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0],
  });

  const ringScale = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.4],
  });

  const purposeLabel = useMemo(() => {
    if (!lastTrip) return '';
    const key = lastTrip.purpose as keyof typeof t;
    return t[key] ?? lastTrip.purpose.charAt(0).toUpperCase() + lastTrip.purpose.slice(1);
  }, [lastTrip, t]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <View style={styles.gpsRow}>
          <View style={[styles.gpsDot, { backgroundColor: gpsColor }]} />
          <Text style={[styles.gpsText, { color: gpsColor }]}>{gpsLabel}</Text>
        </View>
        <Text style={styles.appTitle}>{t.appTitle}</Text>
      </View>

      <View style={styles.centerArea}>
        {isTracking && (
          <Animated.View style={[styles.statsRow, { opacity: fadeAnim }]}>
            <View style={styles.statItem}>
              <Navigation size={16} color={Colors.textSecondary} />
              <Text style={styles.statValue}>
                {formatDistance(distance, settings.rounding, settings.distanceUnit)}
              </Text>
              <Text style={styles.statUnit}>{settings.distanceUnit === 'km' ? t.km : t.mi}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Clock size={16} color={Colors.textSecondary} />
              <Text style={styles.statValue}>{formatDuration(elapsedTime)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Gauge size={16} color={Colors.textSecondary} />
              <Text style={styles.statValue}>{formatSpeed(currentSpeed, settings.distanceUnit)}</Text>
              <Text style={styles.statUnit}>{settings.distanceUnit === 'km' ? t.kmh : t.mph}</Text>
            </View>
          </Animated.View>
        )}

        <View style={styles.buttonContainer}>
          {isTracking && (
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  opacity: ringOpacity,
                  transform: [{ scale: ringScale }],
                  borderColor: Colors.danger,
                },
              ]}
            />
          )}
          <Animated.View
            style={{
              transform: [
                { scale: Animated.multiply(pulseAnim, scaleAnim) },
              ],
            }}
          >
            <Pressable onPress={handlePress} testID="tracking-button">
              <LinearGradient
                colors={
                  isTracking
                    ? ['#FF4757', '#FF6B81']
                    : ['#00D68F', '#00B377']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.mainButton}
              >
                <Text style={styles.buttonLabel}>
                  {isTracking ? t.stop : t.start}
                </Text>
                <Text style={styles.buttonSub}>
                  {isTracking ? t.andSave : t.drive}
                </Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </View>

        {isTracking && (
          <View style={styles.recordingBadge}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>{t.recordingTrip}</Text>
          </View>
        )}
      </View>

      {!isTracking && lastTrip && (
        <Animated.View style={[styles.lastTripCard, { opacity: fadeAnim }]}>
          <Text style={styles.lastTripHeader}>{t.lastTrip}</Text>
          <Pressable
            style={styles.lastTripContent}
            onPress={() => router.push({ pathname: '/trip-detail', params: { id: lastTrip.id } } as any)}
          >
            <View style={styles.lastTripLeft}>
              <View style={styles.lastTripRow}>
                <View
                  style={[
                    styles.purposeBadge,
                    {
                      backgroundColor:
                        Colors.purposes[lastTrip.purpose] + '20',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.purposeText,
                      { color: Colors.purposes[lastTrip.purpose] },
                    ]}
                  >
                    {purposeLabel}
                  </Text>
                </View>
                <Text style={styles.lastTripDistance}>
                  {formatDistance(lastTrip.distance, settings.rounding, settings.distanceUnit)} {settings.distanceUnit === 'km' ? t.km : t.mi}
                </Text>
              </View>
              <Text style={styles.lastTripMeta}>
                {formatDateShort(lastTrip.startTime)} {t.at}{' '}
                {formatTime(lastTrip.startTime)} ·{' '}
                {formatDurationLong(lastTrip.duration)}
              </Text>
            </View>
            <ChevronRight size={18} color={Colors.textMuted} />
          </Pressable>
        </Animated.View>
      )}

      {!isTracking && !lastTrip && (
        <View style={styles.emptyCard}>
          <Navigation size={32} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>{t.noTripsYet}</Text>
          <Text style={styles.emptySubtitle}>
            {t.noTripsYetSub}
          </Text>
        </View>
      )}
    </View>
  );
}

const BUTTON_SIZE = 180;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gpsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  gpsText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  appTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: 0.5,
  },
  centerArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 40,
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    fontVariant: ['tabular-nums'],
  },
  statUnit: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.border,
  },
  buttonContainer: {
    width: BUTTON_SIZE + 60,
    height: BUTTON_SIZE + 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: BUTTON_SIZE + 30,
    height: BUTTON_SIZE + 30,
    borderRadius: (BUTTON_SIZE + 30) / 2,
    borderWidth: 3,
  },
  mainButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  buttonLabel: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  buttonSub: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 1,
    marginTop: 2,
  },
  recordingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.danger,
  },
  recordingText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  lastTripCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: Colors.card,
    borderRadius: 16,
    overflow: 'hidden',
  },
  lastTripHeader: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  lastTripContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  lastTripLeft: {
    flex: 1,
    gap: 6,
  },
  lastTripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  purposeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  purposeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  lastTripDistance: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  lastTripMeta: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  emptyCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center' as const,
    lineHeight: 18,
  },
});
