import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Briefcase, User, HeartPulse, HandHeart, Plus, X, Check } from 'lucide-react-native';
import { useTracking } from '@/providers/TrackingProvider';
import { useTrips } from '@/providers/TripProvider';
import { useI18n } from '@/providers/I18nProvider';
import { Colors } from '@/constants/colors';
import { TripPurpose, Trip } from '@/types/trip';
import { formatDistance, formatDurationLong } from '@/utils/format';

export default function SaveTripScreen() {
  const router = useRouter();
  const { pendingTrip, clearPendingTrip } = useTracking();
  const { addTrip, projects, vehicles, addProject, addVehicle, settings } = useTrips();
  const { t } = useI18n();

  const PURPOSE_CONFIG: {
    key: TripPurpose;
    label: string;
    Icon: typeof Briefcase;
    color: string;
  }[] = useMemo(() => [
    { key: 'business', label: t.business, Icon: Briefcase, color: Colors.purposes.business },
    { key: 'personal', label: t.personal, Icon: User, color: Colors.purposes.personal },
    { key: 'medical', label: t.medical, Icon: HeartPulse, color: Colors.purposes.medical },
    { key: 'charity', label: t.charity, Icon: HandHeart, color: Colors.purposes.charity },
  ], [t]);

  const [purpose, setPurpose] = useState<TripPurpose>('business');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [newVehicleName, setNewVehicleName] = useState('');
  const [showAddProject, setShowAddProject] = useState(false);
  const [showAddVehicle, setShowAddVehicle] = useState(false);

  const handleSave = useCallback(() => {
    if (!pendingTrip) {
      Alert.alert(t.error, t.errorNoTrip);
      return;
    }

    const trip: Trip = {
      id: Date.now().toString(),
      startTime: pendingTrip.startTime,
      endTime: pendingTrip.endTime,
      distance: pendingTrip.distance,
      duration: pendingTrip.duration,
      purpose,
      projectId: selectedProject,
      vehicleId: selectedVehicle,
      notes: notes.trim(),
      routePoints: pendingTrip.routePoints,
    };

    addTrip(trip);
    clearPendingTrip();
    router.back();
  }, [pendingTrip, purpose, selectedProject, selectedVehicle, notes, addTrip, clearPendingTrip, router, t]);

  const handleDiscard = useCallback(() => {
    Alert.alert(t.discardTrip, t.discardTripMsg, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.discard,
        style: 'destructive',
        onPress: () => {
          clearPendingTrip();
          router.back();
        },
      },
    ]);
  }, [clearPendingTrip, router, t]);

  const handleAddProject = useCallback(() => {
    const name = newProjectName.trim();
    if (!name) return;
    const project = addProject(name);
    setSelectedProject(project.id);
    setNewProjectName('');
    setShowAddProject(false);
  }, [newProjectName, addProject]);

  const handleAddVehicle = useCallback(() => {
    const name = newVehicleName.trim();
    if (!name) return;
    const vehicle = addVehicle(name);
    setSelectedVehicle(vehicle.id);
    setNewVehicleName('');
    setShowAddVehicle(false);
  }, [newVehicleName, addVehicle]);

  if (!pendingTrip) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{t.noTripToSave}</Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>{t.goBack}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.summaryCard}>
          <Text style={styles.summaryDistance}>
            {formatDistance(pendingTrip.distance, settings.rounding)} {t.mi}
          </Text>
          <Text style={styles.summaryDuration}>
            {formatDurationLong(pendingTrip.duration)}
          </Text>
        </View>

        <Text style={styles.sectionLabel}>{t.purpose}</Text>
        <View style={styles.purposeGrid}>
          {PURPOSE_CONFIG.map(({ key, label, Icon, color }) => {
            const selected = purpose === key;
            return (
              <Pressable
                key={key}
                style={[
                  styles.purposeCard,
                  selected && { borderColor: color, backgroundColor: color + '15' },
                ]}
                onPress={() => setPurpose(key)}
                testID={`purpose-${key}`}
              >
                <Icon size={20} color={selected ? color : Colors.textMuted} />
                <Text
                  style={[
                    styles.purposeLabel,
                    selected && { color },
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>{t.project}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          <Pressable
            style={[
              styles.chip,
              selectedProject === null && styles.chipSelected,
            ]}
            onPress={() => setSelectedProject(null)}
          >
            <Text
              style={[
                styles.chipText,
                selectedProject === null && styles.chipTextSelected,
              ]}
            >
              {t.none}
            </Text>
          </Pressable>
          {projects.map((p) => (
            <Pressable
              key={p.id}
              style={[
                styles.chip,
                selectedProject === p.id && styles.chipSelected,
              ]}
              onPress={() => setSelectedProject(p.id)}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedProject === p.id && styles.chipTextSelected,
                ]}
              >
                {p.name}
              </Text>
            </Pressable>
          ))}
          {showAddProject ? (
            <View style={styles.addInputRow}>
              <TextInput
                style={styles.addInput}
                value={newProjectName}
                onChangeText={setNewProjectName}
                placeholder={t.name}
                placeholderTextColor={Colors.textMuted}
                autoFocus
                onSubmitEditing={handleAddProject}
              />
              <Pressable onPress={handleAddProject} style={styles.addConfirm}>
                <Check size={16} color={Colors.accent} />
              </Pressable>
              <Pressable
                onPress={() => {
                  setShowAddProject(false);
                  setNewProjectName('');
                }}
                style={styles.addCancel}
              >
                <X size={16} color={Colors.textMuted} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={styles.addChip}
              onPress={() => setShowAddProject(true)}
            >
              <Plus size={14} color={Colors.accent} />
              <Text style={styles.addChipText}>{t.add}</Text>
            </Pressable>
          )}
        </ScrollView>

        <Text style={styles.sectionLabel}>{t.vehicle}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          <Pressable
            style={[
              styles.chip,
              selectedVehicle === null && styles.chipSelected,
            ]}
            onPress={() => setSelectedVehicle(null)}
          >
            <Text
              style={[
                styles.chipText,
                selectedVehicle === null && styles.chipTextSelected,
              ]}
            >
              {t.none}
            </Text>
          </Pressable>
          {vehicles.map((v) => (
            <Pressable
              key={v.id}
              style={[
                styles.chip,
                selectedVehicle === v.id && styles.chipSelected,
              ]}
              onPress={() => setSelectedVehicle(v.id)}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedVehicle === v.id && styles.chipTextSelected,
                ]}
              >
                {v.name}
              </Text>
            </Pressable>
          ))}
          {showAddVehicle ? (
            <View style={styles.addInputRow}>
              <TextInput
                style={styles.addInput}
                value={newVehicleName}
                onChangeText={setNewVehicleName}
                placeholder={t.name}
                placeholderTextColor={Colors.textMuted}
                autoFocus
                onSubmitEditing={handleAddVehicle}
              />
              <Pressable onPress={handleAddVehicle} style={styles.addConfirm}>
                <Check size={16} color={Colors.accent} />
              </Pressable>
              <Pressable
                onPress={() => {
                  setShowAddVehicle(false);
                  setNewVehicleName('');
                }}
                style={styles.addCancel}
              >
                <X size={16} color={Colors.textMuted} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={styles.addChip}
              onPress={() => setShowAddVehicle(true)}
            >
              <Plus size={14} color={Colors.accent} />
              <Text style={styles.addChipText}>{t.add}</Text>
            </Pressable>
          )}
        </ScrollView>

        <Text style={styles.sectionLabel}>{t.notes}</Text>
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder={t.addNotesPlaceholder}
          placeholderTextColor={Colors.textMuted}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        <Pressable
          style={({ pressed }) => [
            styles.saveButton,
            pressed && { opacity: 0.8 },
          ]}
          onPress={handleSave}
          testID="save-trip-button"
        >
          <Text style={styles.saveButtonText}>{t.save}</Text>
        </Pressable>

        <Pressable
          style={styles.discardButton}
          onPress={handleDiscard}
        >
          <Text style={styles.discardButtonText}>{t.discard}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 28,
    gap: 4,
  },
  summaryDistance: {
    fontSize: 36,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  summaryDuration: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 4,
  },
  purposeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  purposeCard: {
    width: '48%' as unknown as number,
    flexBasis: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  purposeLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
    marginBottom: 18,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipSelected: {
    backgroundColor: Colors.accentDim,
    borderColor: Colors.accent,
  },
  chipText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  chipTextSelected: {
    color: Colors.accent,
  },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.accent + '40',
    borderStyle: 'dashed',
  },
  addChipText: {
    fontSize: 14,
    color: Colors.accent,
    fontWeight: '500' as const,
  },
  addInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addInput: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.accent,
    minWidth: 100,
  },
  addConfirm: {
    padding: 6,
  },
  addCancel: {
    padding: 6,
  },
  notesInput: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: Colors.text,
    minHeight: 80,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 28,
  },
  saveButton: {
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  discardButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  discardButtonText: {
    fontSize: 15,
    color: Colors.danger,
    fontWeight: '500' as const,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.card,
    borderRadius: 10,
  },
  backButtonText: {
    fontSize: 15,
    color: Colors.accent,
    fontWeight: '600' as const,
  },
});
