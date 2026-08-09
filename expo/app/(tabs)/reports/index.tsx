import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  RefreshControl,
} from 'react-native';
import { BarChart3, Download, FileText } from 'lucide-react-native';
import { useTrips } from '@/providers/TripProvider';
import { useI18n } from '@/providers/I18nProvider';
import { Colors } from '@/constants/colors';
import { TripPurpose } from '@/types/trip';
import { formatDistance, formatDate, formatDurationLong } from '@/utils/format';
import { escapeCsv, escapeHtml, shareCsvFile, sharePdfFile, showShareError } from '@/utils/sharing';

type DateRange = '7d' | '30d' | '90d' | 'all';

export default function ReportsScreen() {
  const { trips, settings, getProjectName, refetchAll, isRefreshing } = useTrips();
  const { t } = useI18n();
  const [range, setRange] = useState<DateRange>('30d');

  const rangeOptions: { key: DateRange; label: string }[] = useMemo(() => [
    { key: '7d', label: t.days7 },
    { key: '30d', label: t.days30 },
    { key: '90d', label: t.days90 },
    { key: 'all', label: t.allTime },
  ], [t]);

  const purposeLabels: Record<TripPurpose, string> = useMemo(() => ({
    business: t.business,
    personal: t.personal,
    medical: t.medical,
    charity: t.charity,
  }), [t]);

  const filteredTrips = useMemo(() => {
    if (range === 'all') return trips;
    const now = Date.now();
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    return trips.filter((tr) => tr.startTime >= cutoff);
  }, [trips, range]);

  const purposeBreakdown = useMemo(() => {
    const breakdown: Record<TripPurpose, { count: number; distance: number }> = {
      business: { count: 0, distance: 0 },
      personal: { count: 0, distance: 0 },
      medical: { count: 0, distance: 0 },
      charity: { count: 0, distance: 0 },
    };
    filteredTrips.forEach((tr) => {
      breakdown[tr.purpose].count++;
      breakdown[tr.purpose].distance += tr.distance;
    });
    return breakdown;
  }, [filteredTrips]);

  const totalDistance = useMemo(
    () => filteredTrips.reduce((sum, tr) => sum + tr.distance, 0),
    [filteredTrips]
  );

  const totalDuration = useMemo(
    () => filteredTrips.reduce((sum, tr) => sum + tr.duration, 0),
    [filteredTrips]
  );

  const maxPurposeDistance = useMemo(
    () =>
      Math.max(
        ...Object.values(purposeBreakdown).map((b) => b.distance),
        0.1
      ),
    [purposeBreakdown]
  );

  const handleExportCSV = async () => {
    if (filteredTrips.length === 0) {
      Alert.alert(t.noData, t.noDataExport);
      return;
    }

    const distLabel = settings.distanceUnit === 'km' ? 'km' : 'mi';
    const header = `Date,Start Time,End Time,Distance (${distLabel}),Duration (min),Purpose,Project,Notes`;
    const rows = filteredTrips.map((tr) => {
      const date = formatDate(tr.startTime);
      const start = new Date(tr.startTime).toLocaleTimeString();
      const end = new Date(tr.endTime).toLocaleTimeString();
      const dist = formatDistance(tr.distance, settings.rounding, settings.distanceUnit);
      const dur = Math.round(tr.duration / 60);
      const purpose = tr.purpose;
      const project = getProjectName(tr.projectId) ?? '';
      return [date, start, end, dist, dur, purpose, project, tr.notes]
        .map(escapeCsv)
        .join(',');
    });

    const csv = [header, ...rows].join('\n');

    if (Platform.OS === 'web') {
      try {
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tapmiles_export_${range}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } catch {
        Alert.alert(t.error, t.exportNotSupported);
      }
    } else {
      try {
        await shareCsvFile(`TapMiles-${range}-report.csv`, csv);
      } catch (error) {
        showShareError(error);
      }
    }
  };

  const handleExportPDF = async () => {
    if (filteredTrips.length === 0) {
      Alert.alert(t.noData, t.noDataExport);
      return;
    }

    const unit = settings.distanceUnit === 'km' ? 'km' : 'mi';
    const rows = filteredTrips.map((tr) => {
      const project = getProjectName(tr.projectId) ?? '—';
      return `<tr>
        <td>${escapeHtml(formatDate(tr.startTime))}</td>
        <td>${escapeHtml(new Date(tr.startTime).toLocaleTimeString())}</td>
        <td>${escapeHtml(formatDistance(tr.distance, settings.rounding, settings.distanceUnit))} ${unit}</td>
        <td>${escapeHtml(formatDurationLong(tr.duration))}</td>
        <td>${escapeHtml(purposeLabels[tr.purpose])}</td>
        <td>${escapeHtml(project)}</td>
        <td>${escapeHtml(tr.notes || '—')}</td>
      </tr>`;
    }).join('');

    const html = `<!doctype html><html><head><meta charset="utf-8"><style>
      @page { margin: 32px; } body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #17202a; }
      h1 { margin-bottom: 4px; color: #00a978; } .summary { color: #52606d; margin: 0 0 24px; }
      table { width: 100%; border-collapse: collapse; font-size: 10px; }
      th { background: #e9f8f3; text-align: left; } th, td { border: 1px solid #d9e2ec; padding: 7px; vertical-align: top; }
      tr:nth-child(even) { background: #f7f9fb; } .footer { margin-top: 18px; font-size: 9px; color: #7b8794; }
    </style></head><body>
      <h1>TapMiles Mileage Report</h1>
      <p class="summary">${escapeHtml(rangeOptions.find((option) => option.key === range)?.label ?? range)} · ${filteredTrips.length} trips · ${escapeHtml(formatDistance(totalDistance, settings.rounding, settings.distanceUnit))} ${unit} · ${durationHours}h ${durationMins}m</p>
      <table><thead><tr><th>Date</th><th>Start</th><th>Distance</th><th>Duration</th><th>Purpose</th><th>Project</th><th>Notes</th></tr></thead><tbody>${rows}</tbody></table>
      <p class="footer">Generated by TapMiles Mileage Tracker</p>
    </body></html>`;

    try {
      await sharePdfFile(`TapMiles-${range}-report.pdf`, html, 'Share TapMiles PDF report');
    } catch (error) {
      showShareError(error);
    }
  };

  const durationHours = Math.floor(totalDuration / 3600);
  const durationMins = Math.floor((totalDuration % 3600) / 60);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={refetchAll}
          tintColor={Colors.accent}
          colors={[Colors.accent]}
        />
      }
    >
      <View style={styles.rangeRow}>
        {rangeOptions.map((opt) => {
          const isActive = range === opt.key;
          return (
            <Pressable
              key={opt.key}
              style={[styles.rangeChip, isActive && styles.rangeChipActive]}
              onPress={() => setRange(opt.key)}
            >
              <Text
                style={[
                  styles.rangeText,
                  isActive && styles.rangeTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.overviewRow}>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewValue}>
            {formatDistance(totalDistance, settings.rounding, settings.distanceUnit)}
          </Text>
          <Text style={styles.overviewLabel}>{settings.distanceUnit === 'km' ? t.totalKm : t.totalMiles}</Text>
        </View>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewValue}>{filteredTrips.length}</Text>
          <Text style={styles.overviewLabel}>{t.tabTrips}</Text>
        </View>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewValue}>
            {durationHours > 0 ? `${durationHours}h` : `${durationMins}m`}
          </Text>
          <Text style={styles.overviewLabel}>{t.driving}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>{t.byPurpose}</Text>
      <View style={styles.breakdownCard}>
        {(Object.keys(purposeBreakdown) as TripPurpose[]).map((purpose) => {
          const data = purposeBreakdown[purpose];
          const barWidth =
            maxPurposeDistance > 0
              ? (data.distance / maxPurposeDistance) * 100
              : 0;
          const color = Colors.purposes[purpose];

          return (
            <View key={purpose} style={styles.breakdownRow}>
              <View style={styles.breakdownLabelRow}>
                <View style={[styles.breakdownDot, { backgroundColor: color }]} />
                <Text style={styles.breakdownLabel}>
                  {purposeLabels[purpose]}
                </Text>
                <Text style={styles.breakdownCount}>{data.count}</Text>
              </View>
              <View style={styles.barContainer}>
                <View
                  style={[
                    styles.bar,
                    {
                      width: `${Math.max(barWidth, 2)}%` as unknown as number,
                      backgroundColor: color,
                    },
                  ]}
                />
              </View>
              <Text style={styles.breakdownDistance}>
                {formatDistance(data.distance, settings.rounding, settings.distanceUnit)} {settings.distanceUnit === 'km' ? t.km : t.mi}
              </Text>
            </View>
          );
        })}
      </View>

      {filteredTrips.length > 0 && (
        <View style={styles.exportActions}>
          <Pressable
            style={({ pressed }) => [styles.exportButton, pressed && { opacity: 0.7 }]}
            onPress={handleExportCSV}
            testID="export-csv"
          >
            <Download size={18} color={Colors.accent} />
            <Text style={styles.exportText}>{t.exportCSV}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.exportButton, pressed && { opacity: 0.7 }]}
            onPress={handleExportPDF}
            testID="export-pdf"
          >
            <FileText size={18} color={Colors.accent} />
            <Text style={styles.exportText}>Export PDF</Text>
          </Pressable>
        </View>
      )}

      {filteredTrips.length === 0 && (
        <View style={styles.emptyState}>
          <BarChart3 size={40} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>{t.noData}</Text>
          <Text style={styles.emptySubtitle}>
            {t.noTripsInPeriod}
          </Text>
        </View>
      )}
    </ScrollView>
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
  rangeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  rangeChip: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rangeChipActive: {
    backgroundColor: Colors.accentDim,
    borderColor: Colors.accent,
  },
  rangeText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  rangeTextActive: {
    color: Colors.accent,
  },
  overviewRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    gap: 4,
  },
  overviewValue: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  overviewLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500' as const,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  breakdownCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    gap: 14,
    marginBottom: 20,
  },
  breakdownRow: {
    gap: 6,
  },
  breakdownLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  breakdownLabel: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500' as const,
    flex: 1,
  },
  breakdownCount: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  barContainer: {
    height: 6,
    backgroundColor: Colors.surface,
    borderRadius: 3,
    overflow: 'hidden',
  },
  bar: {
    height: 6,
    borderRadius: 3,
  },
  breakdownDistance: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600' as const,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.accentDim,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.accent + '30',
  },
  exportActions: {
    gap: 10,
  },
  exportText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.accent,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 40,
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
  },
});
