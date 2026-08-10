import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Switch,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useJourneyStore } from '@/store/journeyStore';
import { Colors, Spacing, Rounded, Shadow } from '@/constants/theme';
import { ScreenHeader } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';

type Priority = 'critical' | 'high' | 'normal' | 'low';
type StopType = 'errand' | 'meeting' | 'poi' | 'parking' | 'pickup';

/** Parses "HH:MM" → ISO LocalDateTime string for today */
function timeToIso(time: string): string {
  const today = new Date();
  const [h, m] = time.split(':').map(Number);
  today.setHours(h, m, 0, 0);
  return today.toISOString().slice(0, 19);
}

/** Extracts "HH:MM" from an ISO string */
function isoToTime(iso?: string): string {
  if (!iso) return '';
  return iso.slice(11, 16);
}

function validateTime(str: string): boolean {
  return /^\d{2}:\d{2}$/.test(str);
}

export default function StopDetailScreen() {
  const router = useRouter();
  const colors = Colors.light;
  const params = useLocalSearchParams<{
    stopIndex?: string;
    placeName?: string;
    lat?: string;
    lng?: string;
    stopType?: string;
  }>();

  const { draftStops, updateDraftStop, addDraftStop, deleteDraftStop } = useJourneyStore();

  const existingIndex = params.stopIndex !== undefined ? parseInt(params.stopIndex, 10) : -1;
  const existingStop = existingIndex >= 0 ? draftStops?.[existingIndex] : undefined;

  // Local states
  const [placeName] = useState(existingStop?.placeName ?? params.placeName ?? '');
  const [lat] = useState(existingStop?.lat ?? parseFloat(params.lat ?? '0'));
  const [lng] = useState(existingStop?.lng ?? parseFloat(params.lng ?? '0'));
  
  // Visit duration is managed as number
  const [duration, setDuration] = useState<number>(existingStop?.visitDurationMinutes ?? 30);
  const [priority, setPriority] = useState<Priority>((existingStop?.priority as Priority) ?? 'normal');
  const [stopType, setStopType] = useState<StopType>((existingStop?.stopType as StopType) ?? ((params.stopType as StopType) ?? 'errand'));
  
  const [hasWindow, setHasWindow] = useState(
    !!(existingStop?.timeWindowStart || existingStop?.timeWindowEnd)
  );
  const [windowStart, setWindowStart] = useState(isoToTime(existingStop?.timeWindowStart) || '09:00');
  const [windowEnd, setWindowEnd] = useState(isoToTime(existingStop?.timeWindowEnd) || '17:00');
  
  // Parking Preference (mocked local preference state for design fidelity)
  const [parkingPref, setParkingPref] = useState<'street' | 'garage' | 'none'>('street');

  const [errors, setErrors] = useState<Record<string, string>>({});

  const incrementDuration = () => {
    setDuration(prev => Math.min(prev + 15, 480));
  };

  const decrementDuration = () => {
    setDuration(prev => Math.max(prev - 15, 15));
  };

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (duration < 1 || duration > 480) {
      newErrors.duration = 'Süre 1-480 dakika arasında olmalıdır.';
    }

    if (hasWindow) {
      if (windowStart && !validateTime(windowStart)) {
        newErrors.windowStart = 'Geçerli bir saat girin (Örn: 09:30)';
      }
      if (windowEnd && !validateTime(windowEnd)) {
        newErrors.windowEnd = 'Geçerli bir saat girin (Örn: 12:00)';
      }
      if (windowStart && windowEnd && validateTime(windowStart) && validateTime(windowEnd)) {
        const [sh, sm] = windowStart.split(':').map(Number);
        const [eh, em] = windowEnd.split(':').map(Number);
        if (sh * 60 + sm >= eh * 60 + em) {
          newErrors.windowEnd = 'Bitiş saati başlangıç saatinden sonra olmalıdır.';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [duration, hasWindow, windowStart, windowEnd]);

  const handleSave = useCallback(() => {
    if (!validate()) return;

    const stopData = {
      placeName,
      lat,
      lng,
      visitDurationMinutes: duration,
      priority,
      stopType,
      timeWindowStart: hasWindow && windowStart ? timeToIso(windowStart) : undefined,
      timeWindowEnd: hasWindow && windowEnd ? timeToIso(windowEnd) : undefined,
    };

    if (existingIndex >= 0) {
      updateDraftStop?.(existingIndex, stopData);
    } else {
      addDraftStop?.(stopData);
    }

    router.back();
  }, [validate, placeName, lat, lng, duration, priority, stopType, hasWindow, windowStart, windowEnd, existingIndex, addDraftStop, updateDraftStop, router]);

  const handleRemove = useCallback(() => {
    if (existingIndex >= 0) {
      deleteDraftStop?.(existingIndex);
    }
    router.back();
  }, [existingIndex, deleteDraftStop, router]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" />
      <ScreenHeader title="Durak Detayları" />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Place Header Card */}
        <View style={[styles.placeHeaderCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.placeIconContainer, { backgroundColor: colors.surfaceContainer }]}>
            <MaterialIcons 
              name={stopType === 'parking' ? 'local-parking' : stopType === 'meeting' ? 'people' : 'local-cafe'} 
              size={24} 
              color={colors.primary} 
            />
          </View>
          <View style={styles.placeHeaderInfo}>
            <Text style={[styles.placeName, { color: colors.onSurface }]} numberOfLines={2}>
              {placeName || 'İsimsiz Durak'}
            </Text>
            <Text style={[styles.placeAddress, { color: colors.outline }]}>
              {lat.toFixed(4)}, {lng.toFixed(4)}
            </Text>
          </View>
        </View>

        {/* Section: Visit Duration */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Ziyaret Süresi</Text>
          <View style={[styles.durationStepper, { backgroundColor: colors.surface }]}>
            <TouchableOpacity 
              style={[styles.stepperBtn, { backgroundColor: colors.surfaceContainer }]} 
              onPress={decrementDuration}
            >
              <MaterialIcons name="remove" size={22} color={colors.onSurface} />
            </TouchableOpacity>
            <Text style={[styles.durationText, { color: colors.onSurface }]}>{duration} dk</Text>
            <TouchableOpacity 
              style={[styles.stepperBtn, { backgroundColor: colors.surfaceContainer }]} 
              onPress={incrementDuration}
            >
              <MaterialIcons name="add" size={22} color={colors.onSurface} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Section: Arrive By (Time Window Toggle & Picker) */}
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Varış Zamanı</Text>
              <Text style={[styles.sectionSub, { color: colors.outline }]}>Belirli bir zaman aralığı tanımlayın</Text>
            </View>
            <Switch
              value={hasWindow}
              onValueChange={setHasWindow}
              trackColor={{ false: colors.surfaceContainerHigh, true: colors.primary }}
              thumbColor={Platform.OS === 'ios' ? undefined : '#FFFFFF'}
            />
          </View>

          {hasWindow && (
            <View style={[styles.timeWindowContainer, { backgroundColor: colors.surface }]}>
              <View style={styles.timeInputRow}>
                <Text style={[styles.timeInputLabel, { color: colors.outline }]}>Başlangıç</Text>
                <TextInput
                  style={[styles.timeInput, errors.windowStart ? styles.inputError : null, { color: colors.onSurface, backgroundColor: colors.surfaceLow }]}
                  value={windowStart}
                  onChangeText={setWindowStart}
                  placeholder="09:00"
                  maxLength={5}
                />
              </View>
              {errors.windowStart && <Text style={[styles.errorText, { color: colors.error }]}>{errors.windowStart}</Text>}

              <View style={[styles.timeInputRow, { marginTop: 12 }]}>
                <Text style={[styles.timeInputLabel, { color: colors.outline }]}>Bitiş</Text>
                <TextInput
                  style={[styles.timeInput, errors.windowEnd ? styles.inputError : null, { color: colors.onSurface, backgroundColor: colors.surfaceLow }]}
                  value={windowEnd}
                  onChangeText={setWindowEnd}
                  placeholder="17:00"
                  maxLength={5}
                />
              </View>
              {errors.windowEnd && <Text style={[styles.errorText, { color: colors.error }]}>{errors.windowEnd}</Text>}
            </View>
          )}
        </View>

        {/* Section: Stop Priority Segmented Control */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Durak Önceliği</Text>
          <View style={[styles.segmentedControl, { backgroundColor: colors.surfaceLow }]}>
            {(['low', 'normal', 'high'] as Priority[]).map((p) => {
              const isActive = priority === p;
              let label = 'Orta';
              if (p === 'low') label = 'Düşük';
              if (p === 'high') label = 'Yüksek';

              return (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.segment,
                    isActive && [styles.segmentActive, { backgroundColor: colors.surface }],
                  ]}
                  onPress={() => setPriority(p)}
                >
                  <Text style={[
                    styles.segmentText, 
                    { color: colors.onSurfaceVariant },
                    isActive && { color: colors.onSurface, fontWeight: '600' }
                  ]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {priority === 'high' && (
            <TouchableOpacity 
              style={[styles.criticalToggle, { backgroundColor: colors.surfaceLow }]}
              onPress={() => setPriority('critical')}
            >
              <MaterialIcons name="warning" size={18} color={colors.error} />
              <Text style={[styles.criticalToggleText, { color: colors.error }]}>
                Önceliği Kritik Yap (Zorunlu)
              </Text>
            </TouchableOpacity>
          )}
          {priority === 'critical' && (
            <TouchableOpacity 
              style={[styles.criticalToggleActive, { backgroundColor: colors.errorContainer }]}
              onPress={() => setPriority('high')}
            >
              <MaterialIcons name="warning" size={18} color={colors.error} />
              <Text style={[styles.criticalToggleText, { color: colors.onErrorContainer }]}>
                Kritik Öncelik Aktif (En yüksek öncelik)
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Section: Parking Preference */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Otopark Tercihi</Text>
          <View style={styles.chipsRow}>
            <TouchableOpacity
              style={[
                styles.chip,
                { backgroundColor: colors.surface },
                parkingPref === 'street' && [styles.chipActive, { borderColor: colors.primary, backgroundColor: colors.surfaceLow }],
              ]}
              onPress={() => setParkingPref('street')}
            >
              <MaterialIcons name="directions" size={18} color={parkingPref === 'street' ? colors.primary : colors.outline} />
              <Text style={[styles.chipText, { color: colors.outline }, parkingPref === 'street' && { color: colors.primary, fontWeight: '600' }]}>
                Sokak
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.chip,
                { backgroundColor: colors.surface },
                parkingPref === 'garage' && [styles.chipActive, { borderColor: colors.primary, backgroundColor: colors.surfaceLow }],
              ]}
              onPress={() => setParkingPref('garage')}
            >
              <MaterialIcons name="garage" size={18} color={parkingPref === 'garage' ? colors.primary : colors.outline} />
              <Text style={[styles.chipText, { color: colors.outline }, parkingPref === 'garage' && { color: colors.primary, fontWeight: '600' }]}>
                Garaj
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.chip,
                { backgroundColor: colors.surface },
                parkingPref === 'none' && [styles.chipActive, { borderColor: colors.primary, backgroundColor: colors.surfaceLow }],
              ]}
              onPress={() => setParkingPref('none')}
            >
              <MaterialIcons name="block" size={18} color={parkingPref === 'none' ? colors.primary : colors.outline} />
              <Text style={[styles.chipText, { color: colors.outline }, parkingPref === 'none' && { color: colors.primary, fontWeight: '600' }]}>
                Yok
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <Button
            label="Detayları Kaydet"
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleSave}
          />

          {existingIndex >= 0 && (
            <Button
              label="Durağı Kaldır"
              variant="danger"
              size="lg"
              fullWidth
              icon="delete"
              onPress={handleRemove}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  scroll: {
    padding: Spacing.marginMain,
    paddingBottom: 60,
  },
  placeHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: Rounded.xl,
    marginBottom: Spacing.stackLg,
    shadowColor: 'rgba(0, 0, 0, 0.02)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 1,
  },
  placeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  placeHeaderInfo: {
    flex: 1,
  },
  placeName: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  placeAddress: {
    fontSize: 14,
  },
  section: {
    marginBottom: Spacing.stackLg,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.4,
    marginBottom: Spacing.stackSm,
  },
  sectionSub: {
    fontSize: 13,
    marginTop: 2,
    marginBottom: Spacing.stackSm,
  },
  durationStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: Rounded.xl,
    shadowColor: 'rgba(0, 0, 0, 0.02)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 1,
  },
  stepperBtn: {
    width: 40,
    height: 40,
    borderRadius: Rounded.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationText: {
    fontSize: 17,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeWindowContainer: {
    marginTop: 12,
    padding: 16,
    borderRadius: Rounded.xl,
    shadowColor: 'rgba(0, 0, 0, 0.02)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 1,
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeInputLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  timeInput: {
    width: 90,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Rounded.md,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  inputError: {
    borderColor: '#EF4444',
    borderWidth: 1,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
  },
  segmentedControl: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: Rounded.xl,
    height: 46,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Rounded.lg,
  },
  segmentActive: {
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '500',
  },
  criticalToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    borderRadius: Rounded.md,
  },
  criticalToggleActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    borderRadius: Rounded.md,
  },
  criticalToggleText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: Rounded.xl,
    borderWidth: 1,
    borderColor: 'transparent',
    shadowColor: 'rgba(0, 0, 0, 0.02)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 1,
  },
  chipActive: {
    borderWidth: 1.5,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionButtonsContainer: {
    marginTop: Spacing.stackLg,
    gap: 12,
  },
  saveBtn: {
    borderRadius: Rounded.xl,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(42, 20, 180, 0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  saveBtnText: {
    fontSize: 17,
    fontWeight: '600',
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: Rounded.xl,
    paddingVertical: 16,
  },
  removeBtnText: {
    fontSize: 17,
    fontWeight: '600',
  },
});
