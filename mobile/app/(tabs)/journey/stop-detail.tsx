import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useJourneyStore } from '@/store/journeyStore';
import { useSavedLocationStore } from '@/store/savedLocationStore';
import { Colors, Spacing, Rounded, Shadow, Typography, TabBarHeight } from '@/constants/theme';
import { ScreenHeader } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { placesApi } from '@/api/places';
import MapLocationView from '@/components/MapLocationView';
import MapLocationPickerModal, { PickedLocationResult } from '@/components/MapLocationPickerModal';
import { Alert } from 'react-native';

const C = Colors.light;

type Priority = 'low' | 'normal' | 'high' | 'critical';
type StopType = 'errand' | 'meeting' | 'poi' | 'pickup';

function timeToIso(time: string): string {
  const today = new Date();
  const [h, m] = time.split(':').map(Number);
  today.setHours(h || 9, m || 0, 0, 0);
  return today.toISOString().slice(0, 19);
}

function isoToTime(iso?: string): string {
  if (!iso) return '';
  return iso.slice(11, 16);
}

function validateTime(str: string): boolean {
  return /^\d{2}:\d{2}$/.test(str);
}

export default function StopDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    stopIndex?: string;
    placeName?: string;
    lat?: string;
    lng?: string;
    stopType?: string;
  }>();

  const { draftStops, updateDraftStop, addDraftStop, deleteDraftStop } = useJourneyStore();
  const { saveLocation, locations } = useSavedLocationStore();

  const existingIndex = params.stopIndex !== undefined ? parseInt(params.stopIndex, 10) : -1;
  const existingStop = existingIndex >= 0 ? draftStops?.[existingIndex] : undefined;

  // Form states
  const [placeName, setPlaceName] = useState(existingStop?.placeName ?? params.placeName ?? 'Seçilen Konum');
  const [lat, setLat] = useState(existingStop?.lat ?? parseFloat(params.lat ?? '41.0082'));
  const [lng, setLng] = useState(existingStop?.lng ?? parseFloat(params.lng ?? '28.9784'));
  const [duration, setDuration] = useState<number>(existingStop?.visitDurationMinutes ?? 30);
  const [priority, setPriority] = useState<Priority>(
    (existingStop?.priority as Priority) ?? 'normal'
  );
  const [stopType, setStopType] = useState<StopType>(
    (existingStop?.stopType as StopType) ?? ((params.stopType as StopType) ?? 'errand')
  );

  const [hasWindow, setHasWindow] = useState(
    !!(existingStop?.timeWindowStart || existingStop?.timeWindowEnd)
  );
  const [windowStart, setWindowStart] = useState(isoToTime(existingStop?.timeWindowStart) || '09:00');
  const [windowEnd, setWindowEnd] = useState(isoToTime(existingStop?.timeWindowEnd) || '12:00');

  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [isFavorited, setIsFavorited] = useState(
    locations.some(loc => loc.lat === lat && loc.lng === lng)
  );

  // Picker modal state
  const [pickerModalVisible, setPickerModalVisible] = useState(false);
  const handlePickerSelect = (result: PickedLocationResult) => {
    setLat(result.latitude);
    setLng(result.longitude);
    if (result.placeName) setPlaceName(result.placeName);
  };

  const incrementDuration = () => {
    setDuration((prev) => Math.min(prev + 15, 480));
  };

  const decrementDuration = () => {
    setDuration((prev) => Math.max(prev - 15, 15));
  };

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (duration < 1 || duration > 480) {
      newErrors.duration = 'Süre 1-480 dakika arasında olmalıdır.';
    }

    if (hasWindow) {
      if (windowStart && !validateTime(windowStart)) {
        newErrors.windowStart = 'Geçerli saat formatı girin (Örn: 09:30)';
      }
      if (windowEnd && !validateTime(windowEnd)) {
        newErrors.windowEnd = 'Geçerli saat formatı girin (Örn: 12:00)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [duration, hasWindow, windowStart, windowEnd]);

  const handleSave = () => {
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
      updateDraftStop(existingIndex, stopData);
    } else {
      addDraftStop(stopData);
    }

    router.back();
  };

  const handleDelete = () => {
    if (existingIndex >= 0) {
      deleteDraftStop(existingIndex);
    }
    router.back();
  };
  
  const handleFavorite = async () => {
    if (isFavorited) {
      Alert.alert('Bilgi', 'Bu konum zaten favorilerinize eklenmiş.');
      return;
    }
    const success = await saveLocation(placeName, lat, lng, `${lat.toFixed(4)}, ${lng.toFixed(4)}`, 'favorite');
    if (success) {
      Alert.alert('Başarılı', 'Konum favorilere eklendi.');
      setIsFavorited(true);
    }
  };

  const getCategoryIcon = (type: StopType): keyof typeof MaterialIcons.glyphMap => {
    switch (type) {
      case 'meeting':
        return 'business-center';
      case 'pickup':
        return 'local-shipping';
      case 'poi':
        return 'star';
      default:
        return 'place';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScreenHeader 
        title="Durak Detayları" 
        rightComponent={
          <TouchableOpacity onPress={handleFavorite} style={{ paddingHorizontal: Spacing.sm }}>
            <MaterialIcons name={isFavorited ? "favorite" : "favorite-outline"} size={24} color={C.primary} />
          </TouchableOpacity>
        }
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Place Header Info Card */}
        <View style={styles.placeCard}>
          <View style={styles.placeIconBg}>
            <MaterialIcons name={getCategoryIcon(stopType)} size={28} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.placeTitle} numberOfLines={2}>
              {placeName}
            </Text>
            <Text style={styles.placeCoords}>
              {lat.toFixed(4)}° N, {lng.toFixed(4)}° E
            </Text>
          </View>
        </View>

        {/* Mini Map Preview */}
        <View style={styles.sectionCard}>
          <View style={styles.mapHeaderRow}>
            <Text style={styles.cardSectionTitle}>KONUM ÖNİZLEME</Text>
            <TouchableOpacity 
              style={styles.changeLocationBtn} 
              activeOpacity={0.8}
              onPress={() => setPickerModalVisible(true)}
            >
              <MaterialIcons name="edit-location" size={16} color={C.primary} />
              <Text style={styles.changeLocationText}>Haritada Değiştir</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.miniMapWrapper}>
            <MapLocationView
              height={140}
              initialLocation={{ latitude: lat, longitude: lng }}
              markers={[{
                id: 'current_stop',
                latitude: lat,
                longitude: lng,
                title: placeName,
                type: 'stop'
              }]}
              expandable={true}
              showControls={false}
            />
          </View>
        </View>

        {/* Visit Duration Stepper Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardSectionTitle}>ZİYARET SÜRESİ</Text>
          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={styles.stepperBtn}
              activeOpacity={0.7}
              onPress={decrementDuration}
            >
              <MaterialIcons name="remove" size={24} color={C.text} />
            </TouchableOpacity>

            <View style={styles.stepperValueBox}>
              <Text style={styles.stepperValue}>{duration}</Text>
              <Text style={styles.stepperUnit}>dakika</Text>
            </View>

            <TouchableOpacity
              style={styles.stepperBtn}
              activeOpacity={0.7}
              onPress={incrementDuration}
            >
              <MaterialIcons name="add" size={24} color={C.text} />
            </TouchableOpacity>
          </View>
          {errors.duration && <Text style={styles.errorText}>{errors.duration}</Text>}
        </View>

        {/* Priority Segmented Control */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardSectionTitle}>DURAK ÖNCELİĞİ</Text>
          <View style={styles.prioritySegment}>
            <TouchableOpacity
              style={[
                styles.priorityOption,
                priority === 'low' && styles.priorityOptionLowActive,
              ]}
              onPress={() => setPriority('low')}
            >
              <MaterialIcons
                name="arrow-downward"
                size={16}
                color={priority === 'low' ? C.secondary : C.textSecondary}
              />
              <Text
                style={[
                  styles.priorityText,
                  priority === 'low' && { color: C.secondary, fontWeight: '700' },
                ]}
              >
                Düşük
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.priorityOption,
                priority === 'normal' && styles.priorityOptionNormalActive,
              ]}
              onPress={() => setPriority('normal')}
            >
              <MaterialIcons
                name="remove"
                size={16}
                color={priority === 'normal' ? C.primary : C.textSecondary}
              />
              <Text
                style={[
                  styles.priorityText,
                  priority === 'normal' && { color: C.primary, fontWeight: '700' },
                ]}
              >
                Orta
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.priorityOption,
                (priority === 'high' || priority === 'critical') && styles.priorityOptionHighActive,
              ]}
              onPress={() => setPriority('high')}
            >
              <MaterialIcons
                name="priority-high"
                size={16}
                color={priority === 'high' || priority === 'critical' ? C.error : C.textSecondary}
              />
              <Text
                style={[
                  styles.priorityText,
                  (priority === 'high' || priority === 'critical') && {
                    color: C.error,
                    fontWeight: '700',
                  },
                ]}
              >
                Yüksek
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Time Window / Arrival Time */}
        <View style={styles.sectionCard}>
          <View style={styles.switchHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>Zaman Aralığı Belirle</Text>
              <Text style={styles.switchDesc}>Bu durağa belirli bir saatte ulaşmanız gerekiyorsa açın</Text>
            </View>
            <Switch
              value={hasWindow}
              onValueChange={setHasWindow}
              trackColor={{ false: C.surfaceContainerHigh, true: C.primary }}
              thumbColor={Platform.OS === 'ios' ? undefined : '#FFFFFF'}
            />
          </View>

          {hasWindow && (
            <View style={styles.timeInputsRow}>
              <View style={styles.timeInputCol}>
                <Text style={styles.inputLabel}>En Erken</Text>
                <View style={styles.timeInputBox}>
                  <MaterialIcons name="schedule" size={18} color={C.outline} />
                  <TextInput
                    style={styles.timeInput}
                    value={windowStart}
                    onChangeText={setWindowStart}
                    placeholder="09:00"
                    maxLength={5}
                  />
                </View>
              </View>

              <View style={styles.timeInputCol}>
                <Text style={styles.inputLabel}>En Geç</Text>
                <View style={styles.timeInputBox}>
                  <MaterialIcons name="schedule" size={18} color={C.outline} />
                  <TextInput
                    style={styles.timeInput}
                    value={windowEnd}
                    onChangeText={setWindowEnd}
                    placeholder="12:00"
                    maxLength={5}
                  />
                </View>
              </View>
            </View>
          )}
        </View>


      </ScrollView>

      {/* Footer Actions */}
      <View style={styles.footer}>
        <Button
          label="Durak Detaylarını Kaydet"
          variant="primary"
          size="lg"
          fullWidth
          onPress={handleSave}
          style={{ marginBottom: Spacing.sm }}
        />
        {existingIndex >= 0 && (
          <Button
            label="Durağı Kaldır"
            variant="outline"
            size="md"
            fullWidth
            onPress={handleDelete}
            labelStyle={{ color: C.error }}
            style={{ borderColor: C.error }}
          />
          )}
        </View>
      </KeyboardAvoidingView>

      <MapLocationPickerModal
        visible={pickerModalVisible}
        onClose={() => setPickerModalVisible(false)}
        mode="stop"
        title="Durağın Konumunu Değiştir"
        initialCoordinates={{ latitude: lat, longitude: lng }}
        onSelectLocation={handlePickerSelect}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.background,
  },
  scroll: {
    padding: Spacing.gutter,
    paddingBottom: Spacing.xl,
    gap: Spacing.base,
  },
  placeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: Rounded.xl,
    padding: Spacing.base,
    gap: Spacing.md,
    ...Shadow.md,
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  placeIconBg: {
    width: 52,
    height: 52,
    borderRadius: Rounded.lg,
    backgroundColor: C.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeTitle: {
    ...Typography.h3,
    color: C.text,
  },
  placeCoords: {
    ...Typography.caption,
    color: C.textSecondary,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: C.surface,
    borderRadius: Rounded.xl,
    padding: Spacing.base,
    gap: Spacing.md,
    ...Shadow.sm,
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  cardSectionTitle: {
    ...Typography.caption,
    fontWeight: '700',
    color: C.outline,
    letterSpacing: 0.8,
  },
  mapHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  changeLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.primaryFixed,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Rounded.full,
    gap: 4,
  },
  changeLocationText: {
    ...Typography.caption,
    color: C.primary,
    fontWeight: '600',
  },
  miniMapWrapper: {
    borderRadius: Rounded.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
  },
  stepperBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  stepperValueBox: {
    alignItems: 'center',
    minWidth: 90,
  },
  stepperValue: {
    ...Typography.h1,
    color: C.primary,
  },
  stepperUnit: {
    ...Typography.caption,
    color: C.textSecondary,
    fontWeight: '600',
  },
  prioritySegment: {
    flexDirection: 'row',
    backgroundColor: C.surfaceLow,
    borderRadius: Rounded.lg,
    padding: 3,
    gap: 3,
  },
  priorityOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: Rounded.md,
    gap: 4,
  },
  priorityOptionLowActive: {
    backgroundColor: C.secondaryContainer,
  },
  priorityOptionNormalActive: {
    backgroundColor: C.primaryFixed,
  },
  priorityOptionHighActive: {
    backgroundColor: C.errorContainer,
  },
  priorityText: {
    ...Typography.bodySmall,
    color: C.textSecondary,
    fontWeight: '600',
  },
  switchHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  switchTitle: {
    ...Typography.bodyMedium,
    fontWeight: '600',
    color: C.text,
  },
  switchDesc: {
    ...Typography.caption,
    color: C.textSecondary,
    marginTop: 2,
  },
  timeInputsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  timeInputCol: {
    flex: 1,
    gap: 4,
  },
  inputLabel: {
    ...Typography.caption,
    color: C.outline,
    fontWeight: '600',
  },
  timeInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surfaceLow,
    borderRadius: Rounded.md,
    paddingHorizontal: Spacing.md,
    height: 44,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  timeInput: {
    ...Typography.bodyMedium,
    color: C.text,
    flex: 1,
    padding: 0,
  },

  errorText: {
    ...Typography.caption,
    color: C.error,
    marginTop: 4,
  },
  footer: {
    paddingHorizontal: Spacing.gutter,
    paddingTop: Spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? Spacing.xs : Spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.outlineVariant,
  },
});
