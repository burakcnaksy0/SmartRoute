import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useJourneyStore } from '@/store/journeyStore';
import { NlpParsedStop } from '@/api/journey';
import { Colors, Spacing, Rounded } from '@/constants/theme';
import { ScreenHeader } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';

function formatDateTime(isoStr?: string): string {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString('tr-TR', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
}

function StopCard({ stop, index }: { stop: NlpParsedStop; index: number }) {
  const colors = Colors.light;
  const hasCoords = stop.lat != null && stop.lng != null;

  // Render priorities configuration
  const priorityConfig: Record<string, { color: string; bg: string; label: string }> = {
    critical: { color: colors.error, bg: colors.errorContainer, label: 'Kritik' },
    high:     { color: colors.tertiary, bg: colors.tertiaryContainer + '18', label: 'Yüksek' },
    normal:   { color: colors.secondary, bg: colors.secondaryContainer + '18', label: 'Orta' },
    low:      { color: colors.outline, bg: colors.surfaceLow, label: 'Düşük' },
  };

  const p = stop.priority?.toLowerCase() ?? 'normal';
  const cfg = priorityConfig[p] || priorityConfig.normal;

  return (
    <View style={[styles.stopCard, { backgroundColor: colors.surface, borderColor: 'rgba(0, 0, 0, 0.04)' }]}>
      <View style={[styles.stopHeader, { borderBottomColor: colors.surfaceContainer }]}>
        <View style={[styles.stopIndex, { backgroundColor: colors.primary }]}>
          <Text style={styles.stopIndexText}>{index + 1}</Text>
        </View>
        <Text style={[styles.stopName, { color: colors.onSurface }]} numberOfLines={2}>
          {stop.placeName || 'İsimsiz Durak'}
        </Text>
      </View>

      <View style={styles.stopDetails}>
        {!hasCoords ? (
          <View style={[styles.geocodingWarning, { backgroundColor: colors.errorContainer + '15' }]}>
            <MaterialIcons name="warning" size={16} color={colors.error} />
            <Text style={[styles.geocodingWarningText, { color: colors.error }]}>
              Koordinat eksik — düzeltmek için lütfen manuel düzenleyin.
            </Text>
          </View>
        ) : (
          <View style={styles.coordRow}>
            <MaterialIcons name="my-location" size={14} color={colors.outline} />
            <Text style={[styles.coordText, { color: colors.outline }]}>
              {stop.lat?.toFixed(4)}, {stop.lng?.toFixed(4)}
            </Text>
          </View>
        )}

        <View style={styles.metaRowChips}>
          {stop.visitDurationMinutes != null && (
            <View style={[styles.metaChip, { backgroundColor: colors.surfaceLow }]}>
              <MaterialIcons name="schedule" size={12} color={colors.outline} />
              <Text style={[styles.metaChipText, { color: colors.outline }]}>{stop.visitDurationMinutes} dk</Text>
            </View>
          )}
          <View style={[styles.metaChip, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.metaChipText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
          {stop.stopType && (
            <View style={[styles.metaChip, { backgroundColor: colors.surfaceLow }]}>
              <Text style={[styles.metaChipText, { color: colors.outline }]}>{stop.stopType}</Text>
            </View>
          )}
        </View>

        {(stop.timeWindowStart || stop.timeWindowEnd) && (
          <View style={styles.timeWindowRow}>
            <MaterialIcons name="hourglass-empty" size={14} color={colors.primary} />
            <Text style={[styles.timeWindowValue, { color: colors.primary }]}>
              Hedef: {formatDateTime(stop.timeWindowStart)} – {formatDateTime(stop.timeWindowEnd)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function NlpConfirmScreen() {
  const router = useRouter();
  const colors = Colors.light;
  const {
    nlpParsedResult,
    isLoading,
    error,
    createJourney,
    clearNlpResult,
  } = useJourneyStore();

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  if (!nlpParsedResult) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }, styles.centered]}>
        <MaterialIcons name="search" size={44} color={colors.outline} />
        <Text style={[styles.emptyText, { color: colors.outline }]}>Çözümlenmiş taslak rota bulunamadı.</Text>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.replace('/(tabs)/journey/nlp-input' as any)}
        >
          <Text style={[styles.backBtnText, { color: colors.onPrimary }]}>Geri Dön</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const stopsWithCoords = nlpParsedResult.stops?.filter(
    (s) => s.lat != null && s.lng != null
  ) ?? [];

  const canConfirm =
    nlpParsedResult.startLat != null &&
    nlpParsedResult.startLng != null &&
    stopsWithCoords.length > 0;

  const handleConfirm = async () => {
    if (!canConfirm) {
      Alert.alert(
        'Eksik Detaylar',
        'Başlangıç konumu koordinatları ve en az bir durak koordinatı gereklidir. Lütfen manuel girişe geçin.',
        [
          { text: 'Manuel Planlayıcı', onPress: () => router.replace('/(tabs)/journey/new-stop' as any) },
          { text: 'İptal', style: 'cancel' },
        ]
      );
      return;
    }

    const journey = await createJourney({
      startLat: nlpParsedResult.startLat!,
      startLng: nlpParsedResult.startLng!,
      startAddressText: nlpParsedResult.startAddressText,
      plannedDepartureTime: nlpParsedResult.plannedDepartureTime,
      deadlineTime: nlpParsedResult.deadlineTime,
      stops: stopsWithCoords.map((s) => ({
        placeName: s.placeName ?? 'Durak',
        lat: s.lat!,
        lng: s.lng!,
        visitDurationMinutes: s.visitDurationMinutes ?? 15,
        timeWindowStart: s.timeWindowStart,
        timeWindowEnd: s.timeWindowEnd,
        priority: (s.priority as any) ?? 'normal',
        stopType: (s.stopType as any) ?? 'errand',
      })),
    });

    if (journey) {
      clearNlpResult();
      router.replace(`/(tabs)/journey/plan-result` as any);
    }
  };

  const handleReject = () => {
    Alert.alert(
      'Planı Sil',
      'Bu yapay zeka taslağını silmek istediğinizden emin misiniz?',
      [
        { text: 'Sil', style: 'destructive', onPress: () => { clearNlpResult(); router.back(); } },
        { text: 'Vazgeç', style: 'cancel' },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" />
      <ScreenHeader title="Taslağı Onayla" />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
          
          {/* Header check icon */}
          <View style={styles.confirmHeader}>
            <View style={[styles.checkCircle, { backgroundColor: colors.secondaryContainer }]}>
              <MaterialIcons name="done" size={32} color={colors.onSecondaryContainer} />
            </View>
            <Text style={[styles.title, { color: colors.onSurface }]}>Başarıyla Çözümlendi!</Text>
            <Text style={[styles.subtitle, { color: colors.outline }]}>
              Yapay zeka asistanı tarafından çıkarılan durakları ve ayrıntıları inceleyin.
            </Text>
          </View>

          {/* Start parameters card */}
          <View style={[styles.metaCard, { backgroundColor: colors.surface }]}>
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: colors.outline }]}>Başlangıç Konumu</Text>
              <Text style={[styles.metaValue, { color: colors.onSurface }]} numberOfLines={2}>
                {nlpParsedResult.startAddressText ?? '—'}
              </Text>
            </View>
            {nlpParsedResult.plannedDepartureTime && (
              <View style={styles.metaRow}>
                <Text style={[styles.metaLabel, { color: colors.outline }]}>Yola Çıkış</Text>
                <Text style={[styles.metaValue, { color: colors.onSurface }]}>
                  {formatDateTime(nlpParsedResult.plannedDepartureTime)}
                </Text>
              </View>
            )}
            {nlpParsedResult.deadlineTime && (
              <View style={styles.metaRow}>
                <Text style={[styles.metaLabel, { color: colors.outline }]}>Bitiş Zamanı</Text>
                <Text style={[styles.metaValue, { color: colors.onSurface }]}>
                  {formatDateTime(nlpParsedResult.deadlineTime)}
                </Text>
              </View>
            )}
          </View>

          {/* Missing coordinates warning */}
          {!canConfirm && (
            <View style={[styles.warnBanner, { backgroundColor: colors.tertiaryContainer + '10', borderColor: colors.tertiary }]}>
              <MaterialIcons name="warning" size={18} color={colors.tertiary} />
              <Text style={[styles.warnText, { color: colors.tertiary }]}>
                Bazı durakların koordinatları eksik. Lütfen manuel düzenleyin.
              </Text>
            </View>
          )}

          {/* API errors */}
          {error && (
            <View style={[styles.errorBanner, { backgroundColor: colors.errorContainer + '15', borderColor: colors.error }]}>
              <MaterialIcons name="warning" size={18} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            </View>
          )}

          {/* Stops List */}
          <Text style={[styles.sectionTitle, { color: colors.outline }]}>Çözümlenen Duraklar ({nlpParsedResult.stops?.length ?? 0})</Text>
          {nlpParsedResult.stops?.map((stop, i) => (
            <StopCard key={i} stop={stop} index={i} />
          ))}

          {/* Action buttons */}
          <View style={styles.actions}>
            {isLoading ? (
              <View style={[styles.confirmBtn, { backgroundColor: colors.secondary }]}>
                <ActivityIndicator color={colors.onSecondary} size="small" />
                <Text style={[styles.confirmBtnText, { color: colors.onSecondary }]}>  Rota Optimize Ediliyor...</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: colors.secondary }, !canConfirm && styles.confirmBtnDisabled]}
                onPress={handleConfirm}
                disabled={!canConfirm}
                activeOpacity={0.8}
              >
                <MaterialIcons name="done" size={20} color={colors.onSecondary} />
                <Text style={[styles.confirmBtnText, { color: colors.onSecondary }]}>
                  Onayla ve Rotaları Bul
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={[styles.rejectBtn, { borderColor: colors.error }]} 
              onPress={handleReject} 
              disabled={isLoading}
            >
              <MaterialIcons name="delete" size={18} color={colors.error} />
              <Text style={[styles.rejectBtnText, { color: colors.error }]}>Planı Sil</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.manualLink}
              onPress={() => router.replace('/(tabs)/journey/new-stop' as any)}
              disabled={isLoading}
            >
              <Text style={[styles.manualLinkText, { color: colors.primary }]}>Manuel Planlayıcıya Geç →</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 32,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  scroll: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: Spacing.marginMain,
    paddingTop: Spacing.stackLg,
    gap: Spacing.stackLg,
  },
  confirmHeader: {
    alignItems: 'center',
    gap: 12,
    marginTop: Spacing.stackSm,
  },
  checkCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  metaCard: {
    borderRadius: Rounded.xl,
    padding: 16,
    gap: 12,
    shadowColor: 'rgba(0, 0, 0, 0.02)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 1,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  metaLabel: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 90,
  },
  metaValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'right',
  },
  warnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: Rounded.xl,
    padding: 12,
    borderWidth: 1,
  },
  warnText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: Rounded.xl,
    padding: 12,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 4,
    marginTop: Spacing.stackSm,
  },
  stopCard: {
    borderRadius: Rounded.xl,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: 'rgba(0, 0, 0, 0.02)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 1,
  },
  stopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
  },
  stopIndex: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopIndexText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  stopName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  stopDetails: {
    padding: 14,
    gap: 10,
  },
  geocodingWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Rounded.md,
    padding: 8,
  },
  geocodingWarningText: {
    fontSize: 12,
    fontWeight: '500',
  },
  coordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coordText: {
    fontSize: 13,
    fontWeight: '500',
  },
  metaRowChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaChip: {
    borderRadius: Rounded.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  timeWindowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  timeWindowValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  actions: {
    gap: 12,
    marginTop: Spacing.stackSm,
    marginBottom: 40,
  },
  confirmBtn: {
    height: 56,
    borderRadius: Rounded.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: 'rgba(0, 108, 73, 0.25)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmBtnText: {
    fontSize: 17,
    fontWeight: '600',
  },
  rejectBtn: {
    height: 56,
    borderRadius: Rounded.xl,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  rejectBtnText: {
    fontSize: 17,
    fontWeight: '600',
  },
  manualLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  manualLinkText: {
    fontSize: 15,
    fontWeight: '600',
  },
  backBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: Rounded.xl,
    marginTop: 12,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
