import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Alert,
  TextInput,
} from 'react-native';
import {
  Ruler,
  Lock,
  Pencil,
  Car,
  FolderOpen,
  Trash2,
  Info,
  Plus,
  X,
  Globe,
  ChevronRight,
} from 'lucide-react-native';
import { useTrips } from '@/providers/TripProvider';
import { useI18n } from '@/providers/I18nProvider';
import { Colors } from '@/constants/colors';
import { SupportedLocale } from '@/i18n/translations';

export default function SettingsScreen() {
  const {
    settings,
    updateSettings,
    projects,
    vehicles,
    addProject,
    deleteProject,
    addVehicle,
    deleteVehicle,
    trips,
  } = useTrips();

  const { t, locale, changeLocale, supportedLocales, localeName } = useI18n();

  const [newProject, setNewProject] = useState('');
  const [newVehicle, setNewVehicle] = useState('');
  const [showAddProject, setShowAddProject] = useState(false);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  const handleAddProject = () => {
    const name = newProject.trim();
    if (!name) return;
    addProject(name);
    setNewProject('');
    setShowAddProject(false);
  };

  const handleAddVehicle = () => {
    const name = newVehicle.trim();
    if (!name) return;
    addVehicle(name);
    setNewVehicle('');
    setShowAddVehicle(false);
  };

  const handleDeleteProject = (id: string, name: string) => {
    const usedCount = trips.filter((tr) => tr.projectId === id).length;
    const msg = t.deleteProjectMsg.replace('{{name}}', name) +
      (usedCount > 0 ? ` ${t.usedInTrips.replace('{{count}}', String(usedCount))}` : '');
    Alert.alert(
      t.deleteProject,
      msg,
      [
        { text: t.cancel, style: 'cancel' },
        { text: t.delete, style: 'destructive', onPress: () => deleteProject(id) },
      ]
    );
  };

  const handleDeleteVehicle = (id: string, name: string) => {
    const usedCount = trips.filter((tr) => tr.vehicleId === id).length;
    const msg = t.deleteVehicleMsg.replace('{{name}}', name) +
      (usedCount > 0 ? ` ${t.usedInTrips.replace('{{count}}', String(usedCount))}` : '');
    Alert.alert(
      t.deleteVehicle,
      msg,
      [
        { text: t.cancel, style: 'cancel' },
        { text: t.delete, style: 'destructive', onPress: () => deleteVehicle(id) },
      ]
    );
  };

  const handleSelectLocale = (code: SupportedLocale) => {
    changeLocale(code);
    setShowLanguagePicker(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>{t.preferences}</Text>
      <View style={styles.section}>
        <Pressable
          style={styles.row}
          onPress={() => setShowLanguagePicker(!showLanguagePicker)}
        >
          <View style={styles.rowLeft}>
            <Globe size={18} color={Colors.textSecondary} />
            <Text style={styles.rowLabel}>{t.language}</Text>
          </View>
          <View style={styles.languageValue}>
            <Text style={styles.languageText}>{localeName}</Text>
            <ChevronRight size={16} color={Colors.textMuted} />
          </View>
        </Pressable>

        {showLanguagePicker && (
          <View style={styles.languagePicker}>
            {supportedLocales.map((loc) => {
              const isActive = locale === loc.code;
              return (
                <Pressable
                  key={loc.code}
                  style={[
                    styles.languageOption,
                    isActive && styles.languageOptionActive,
                  ]}
                  onPress={() => handleSelectLocale(loc.code)}
                >
                  <Text
                    style={[
                      styles.languageOptionText,
                      isActive && styles.languageOptionTextActive,
                    ]}
                  >
                    {loc.name}
                  </Text>
                  {isActive && (
                    <View style={styles.checkDot} />
                  )}
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Ruler size={18} color={Colors.textSecondary} />
            <Text style={styles.rowLabel}>{t.distanceRounding}</Text>
          </View>
          <View style={styles.segmentControl}>
            <Pressable
              style={[
                styles.segment,
                settings.rounding === '0.1' && styles.segmentActive,
              ]}
              onPress={() => updateSettings({ rounding: '0.1' })}
            >
              <Text
                style={[
                  styles.segmentText,
                  settings.rounding === '0.1' && styles.segmentTextActive,
                ]}
              >
                0.1
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.segment,
                settings.rounding === '0.01' && styles.segmentActive,
              ]}
              onPress={() => updateSettings({ rounding: '0.01' })}
            >
              <Text
                style={[
                  styles.segmentText,
                  settings.rounding === '0.01' && styles.segmentTextActive,
                ]}
              >
                0.01
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Lock size={18} color={Colors.textSecondary} />
            <Text style={styles.rowLabel}>{t.lockTripsAfter24h}</Text>
          </View>
          <Switch
            value={settings.lockTripsAfter24h}
            onValueChange={(val) => updateSettings({ lockTripsAfter24h: val })}
            trackColor={{ false: Colors.border, true: Colors.accent }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Pencil size={18} color={Colors.textSecondary} />
            <Text style={styles.rowLabel}>{t.allowTripEdits}</Text>
          </View>
          <Switch
            value={settings.allowEdits}
            onValueChange={(val) => updateSettings({ allowEdits: val })}
            trackColor={{ false: Colors.border, true: Colors.accent }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>{t.projects}</Text>
      <View style={styles.section}>
        {projects.map((p) => (
          <View key={p.id}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <FolderOpen size={16} color={Colors.textMuted} />
                <Text style={styles.rowLabel}>{p.name}</Text>
              </View>
              <Pressable
                onPress={() => handleDeleteProject(p.id, p.name)}
                hitSlop={8}
              >
                <Trash2 size={16} color={Colors.danger} />
              </Pressable>
            </View>
            <View style={styles.divider} />
          </View>
        ))}
        {showAddProject ? (
          <View style={styles.addRow}>
            <TextInput
              style={styles.addInput}
              value={newProject}
              onChangeText={setNewProject}
              placeholder={t.projectName}
              placeholderTextColor={Colors.textMuted}
              autoFocus
              onSubmitEditing={handleAddProject}
            />
            <Pressable onPress={handleAddProject} style={styles.addBtn}>
              <Plus size={18} color={Colors.accent} />
            </Pressable>
            <Pressable
              onPress={() => {
                setShowAddProject(false);
                setNewProject('');
              }}
              style={styles.addBtn}
            >
              <X size={18} color={Colors.textMuted} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={styles.addItemButton}
            onPress={() => setShowAddProject(true)}
          >
            <Plus size={16} color={Colors.accent} />
            <Text style={styles.addItemText}>{t.addProject}</Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.sectionTitle}>{t.vehicles}</Text>
      <View style={styles.section}>
        {vehicles.map((v) => (
          <View key={v.id}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Car size={16} color={Colors.textMuted} />
                <Text style={styles.rowLabel}>{v.name}</Text>
              </View>
              <Pressable
                onPress={() => handleDeleteVehicle(v.id, v.name)}
                hitSlop={8}
              >
                <Trash2 size={16} color={Colors.danger} />
              </Pressable>
            </View>
            <View style={styles.divider} />
          </View>
        ))}
        {showAddVehicle ? (
          <View style={styles.addRow}>
            <TextInput
              style={styles.addInput}
              value={newVehicle}
              onChangeText={setNewVehicle}
              placeholder={t.vehicleName}
              placeholderTextColor={Colors.textMuted}
              autoFocus
              onSubmitEditing={handleAddVehicle}
            />
            <Pressable onPress={handleAddVehicle} style={styles.addBtn}>
              <Plus size={18} color={Colors.accent} />
            </Pressable>
            <Pressable
              onPress={() => {
                setShowAddVehicle(false);
                setNewVehicle('');
              }}
              style={styles.addBtn}
            >
              <X size={18} color={Colors.textMuted} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={styles.addItemButton}
            onPress={() => setShowAddVehicle(true)}
          >
            <Plus size={16} color={Colors.accent} />
            <Text style={styles.addItemText}>{t.addVehicle}</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.aboutSection}>
        <Info size={16} color={Colors.textMuted} />
        <Text style={styles.aboutText}>
          {t.aboutDisclaimer}
        </Text>
      </View>

      <Text style={styles.versionText}>TapMiles v1.0.0</Text>
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
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 8,
  },
  section: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  segmentControl: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 2,
  },
  segment: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  segmentActive: {
    backgroundColor: Colors.accent,
  },
  segmentText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600' as const,
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  languageValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  languageText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  languagePicker: {
    paddingBottom: 8,
    gap: 4,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: Colors.surface,
  },
  languageOptionActive: {
    backgroundColor: Colors.accentDim,
    borderWidth: 1,
    borderColor: Colors.accent + '40',
  },
  languageOptionText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  languageOptionTextActive: {
    color: Colors.accent,
    fontWeight: '600' as const,
  },
  checkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  addInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: Colors.text,
  },
  addBtn: {
    padding: 6,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
  },
  addItemText: {
    fontSize: 15,
    color: Colors.accent,
    fontWeight: '500' as const,
  },
  aboutSection: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  aboutText: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
    flex: 1,
  },
  versionText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center' as const,
    marginTop: 8,
  },
});
