import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Linking,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { decodePolyline } from '@/utils/polyline';
import { useJourneyStore } from '@/store/journeyStore';
import { Colors, Spacing, Rounded, Shadow, Typography, TabBarHeight } from '@/constants/theme';
import { ScreenHeader } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/States';
import MapLocationView from '@/components/MapLocationView';

const C = Colors.light;

export default function ActiveJourneyScreen() {
  const router = useRouter();
  const {
    currentJourney,
    completedStopIds,
    replanSuggested,
    replanMessage,
    proposedPlan,
    isReplanLoading,
    markStopAsCompleted,
    triggerReplan,
    confirmReplan,
    cancelReplan,
  } = useJourneyStore();

  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number }>({
    latitude: currentJourney?.startLat ?? 41.0082,
    longitude: currentJourney?.startLng ?? 28.9784,
  });

  const stopsSorted = [...(currentJourney?.stops ?? [])].sort(
    (a, b) => (a.optimizedOrder ?? a.sequenceOrder) - (b.optimizedOrder ?? b.sequenceOrder)
  );

  const completedCount = completedStopIds.length;
  const totalCount = stopsSorted.length;
  const currentStop = stopsSorted.find((s) => !completedStopIds.includes(s.id));
  const previousStop = completedCount > 0 ? stopsSorted[completedCount - 1] : null;

  const progressPct = totalCount > 0 ? completedCount / totalCount : 0;
  const progressAnim = useRef(new Animated.Value(progressPct)).current;

  useEffect(() => {
    Animated.spring(progressAnim, {
      toValue: progressPct,
      useNativeDriver: false,
    }).start();
  }, [progressPct]);

  const handleOpenNavigation = () => {
    if (!currentStop) return;
    const url =
      Platform.OS === 'ios'
        ? `maps://?q=${currentStop.lat},${currentStop.lng}`
        : `geo:${currentStop.lat},${currentStop.lng}?q=${currentStop.lat},${currentStop.lng}`;
    Linking.canOpenURL(url).then((supported) => {
      if (supported) Linking.openURL(url);
      else Alert.alert('Hata', 'Harita uygulaması açılamadı.');
    });
  };

  const handleArrived = () => {
    if (currentStop) {
      markStopAsCompleted(currentStop.id);
    }
  };

  const handleSimulateTrafficChange = async () => {
    const suggested = await triggerReplan(userLocation.latitude, userLocation.longitude);
    if (!suggested) {
      Alert.alert('Güzergah Durumu', 'Rotanızda önemli bir trafik yoğunluğu değişikliği tespit edilmedi.');
    }
  };

  const handleConfirmReplan = async () => {
    const success = await confirmReplan(userLocation.latitude, userLocation.longitude);
    if (success) {
      Alert.alert('Güncellendi', 'Rotanız başarıyla yeniden optimize edildi!');
    }
  };

  // Decode route polylines
  const selectedPlan = currentJourney?.plans.find((p) => p.isSelected) || currentJourney?.plans[0];
  const polylinePoints =
    selectedPlan?.legs?.flatMap((leg) => {
      if (!leg.polylineEncoded) return [];
      return decodePolyline(leg.polylineEncoded);
    }) ?? [];

  // Completed State
  if (!currentJourney || currentJourney.status === 'completed') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <EmptyState
          icon="emoji-events"
          title="Yolculuk Tamamlandı! 🎉"
          description="Tebrikler! Optimize edilmiş rotanızdaki tüm duraklara başarıyla ulaştınız."
          iconColor={C.secondary}
          iconBg={C.secondaryContainer}
          actionLabel="Panoya Dön"
          onAction={() => router.replace('/(tabs)/journey')}
          style={{ flex: 1 }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <ScreenHeader
        title="Aktif Navigasyon"
        rightComponent={
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)/journey')}
            style={styles.closeBtn}
          >
            <Text style={styles.closeBtnText}>Bitti</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Real-time Map Header with Route Polylines */}
        <View style={styles.mapCard}>
          <MapLocationView
            height={260}
            initialLocation={userLocation}
            onLocationChange={(coords) => setUserLocation(coords)}
            markers={stopsSorted.map((s, idx) => ({
              id: s.id,
              latitude: s.lat,
              longitude: s.lng,
              title: `${idx + 1}. ${s.placeName}`,
              subtitle: `${s.visitDurationMinutes} dk`,
              pinColor: completedStopIds.includes(s.id)
                ? '#9E9E9E'
                : s.priority === 'critical'
                ? C.error
                : C.primary,
            }))}
            routePolyline={polylinePoints}
          />
        </View>

        {/* HUD Driving Status Sheet */}
        <View style={styles.hudSheet}>
          <View style={styles.hudHeader}>
            <View>
              <Text style={styles.hudEtaLabel}>Kalan Süre</Text>
              <Text style={styles.hudEtaVal}>
                {currentStop ? `${currentStop.visitDurationMinutes + 12} dk` : 'Varıldı'}
              </Text>
            </View>
            <View style={styles.hudDivider} />
            <View>
              <Text style={styles.hudEtaLabel}>Hedef Varış</Text>
              <Text style={styles.hudEtaVal}>
                {new Date(Date.now() + 24 * 60000).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
            <View style={styles.hudDivider} />
            <View>
              <Text style={styles.hudEtaLabel}>İlerleme</Text>
              <Text style={[styles.hudEtaVal, { color: C.secondary }]}>
                %{Math.round(progressPct * 100)}
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>

          {/* Current Stop & Previous Stop Display */}
          {currentStop ? (
            <View style={styles.stopCard}>
              <View style={styles.stopCardHeader}>
                <Badge
                  label={currentStop.priority === 'critical' ? 'Kritik Hedef' : 'Sıradaki Durak'}
                  variant={currentStop.priority === 'critical' ? 'error' : 'primary'}
                  size="sm"
                />
                {currentStop.timeWindowEnd && (
                  <Text style={styles.timeWindowTag}>
                    En geç{' '}
                    {new Date(currentStop.timeWindowEnd).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                )}
              </View>

              <Text style={styles.stopName} numberOfLines={2}>
                {currentStop.placeName}
              </Text>

              {previousStop && (
                <Text style={styles.prevStopText}>
                  Son geçilen: {previousStop.placeName}
                </Text>
              )}

              <View style={styles.stopActionsRow}>
                <TouchableOpacity
                  style={styles.navActionBtn}
                  onPress={handleOpenNavigation}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="explore" size={20} color={C.primary} />
                  <Text style={styles.navActionText}>Haritada Aç</Text>
                </TouchableOpacity>

                <Button
                  label="Varıldı ✓"
                  variant="secondary"
                  size="md"
                  onPress={handleArrived}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          ) : (
            <View style={styles.stopCard}>
              <MaterialIcons name="check-circle" size={36} color={C.secondary} />
              <Text style={styles.stopName}>Tüm Duraklar Tamamlandı!</Text>
            </View>
          )}

          {/* Alternative Route & Replan Actions */}
          <View style={styles.hudActionsRow}>
            <Button
              label="Trafik / Alt. Rota Kontrolü"
              icon="traffic"
              variant="outline"
              size="md"
              fullWidth
              loading={isReplanLoading}
              onPress={handleSimulateTrafficChange}
            />
          </View>
        </View>

        {/* Detailed Itinerary Timeline */}
        <View style={styles.timelineSection}>
          <Text style={styles.sectionHeading}>YOLCULUK İLERLEMESİ</Text>
          <View style={styles.timeline}>
            {stopsSorted.map((stop, idx) => {
              const isCompleted = completedStopIds.includes(stop.id);
              const isCurrent = currentStop?.id === stop.id;
              const isLast = idx === stopsSorted.length - 1;

              return (
                <View key={stop.id} style={styles.timelineItem}>
                  <View style={styles.indicatorCol}>
                    <View
                      style={[
                        styles.timelineDot,
                        isCompleted && styles.timelineDotDone,
                        isCurrent && styles.timelineDotCurrent,
                      ]}
                    >
                      {isCompleted && (
                        <MaterialIcons name="done" size={10} color={C.onSecondary} />
                      )}
                    </View>
                    {!isLast && (
                      <View
                        style={[styles.timelineLine, isCompleted && styles.timelineLineDone]}
                      />
                    )}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text
                      style={[
                        styles.timelineTitle,
                        isCompleted && styles.timelineTitleDone,
                        isCurrent && styles.timelineTitleCurrent,
                      ]}
                    >
                      {stop.placeName}
                    </Text>
                    <Text style={styles.timelineSub}>
                      {isCompleted
                        ? 'Tamamlandı'
                        : `${stop.visitDurationMinutes} dk · ${stop.priority === 'critical' ? 'Kritik Öncelik' : 'Normal'}`}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Dynamic Replan Modal Overlay */}
      {replanSuggested && (
        <View style={styles.overlayBg}>
          <View style={styles.replanSheet}>
            <View style={styles.replanHandle} />
            <View style={styles.replanHeader}>
              <View style={styles.replanIconBg}>
                <MaterialIcons name="traffic" size={24} color={C.error} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.replanTitle}>Trafik Yoğunluğu Algılandı</Text>
                <Text style={styles.replanSub}>Alternatif güzergah hesaplandı</Text>
              </View>
            </View>

            <Text style={styles.replanDesc}>{replanMessage}</Text>

            {proposedPlan && (
              <View style={styles.replanMetricsRow}>
                <View style={styles.replanMetricItem}>
                  <Text style={styles.replanMetricLabel}>Yeni Süre</Text>
                  <Text style={styles.replanMetricVal}>
                    {Math.floor(proposedPlan.totalDurationSeconds / 60)} dk
                  </Text>
                </View>
                <View style={styles.replanMetricDivider} />
                <View style={styles.replanMetricItem}>
                  <Text style={styles.replanMetricLabel}>Tahmini Masraf</Text>
                  <Text style={[styles.replanMetricVal, { color: C.secondary }]}>
                    {(proposedPlan.totalFuelCostEstimate ?? 0).toFixed(2)} TL
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.replanButtonsRow}>
              <Button
                label="Mevcut Rota"
                variant="secondary"
                size="md"
                onPress={cancelReplan}
                style={{ flex: 1 }}
              />
              <Button
                label="Yeni Rotayı Uygula"
                variant="primary"
                size="md"
                onPress={handleConfirmReplan}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.background,
  },
  closeBtn: {
    paddingHorizontal: Spacing.sm,
  },
  closeBtnText: {
    ...Typography.bodyMedium,
    color: C.primary,
    fontWeight: '600',
  },
  scroll: {
    padding: Spacing.gutter,
    paddingBottom: TabBarHeight + 90,
    gap: Spacing.base,
  },
  mapCard: {
    borderRadius: Rounded['2xl'],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.outlineVariant,
    ...Shadow.md,
  },
  hudSheet: {
    backgroundColor: C.surface,
    borderRadius: Rounded['2xl'],
    padding: Spacing.base,
    gap: Spacing.md,
    ...Shadow.lg,
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  hudHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  hudEtaLabel: {
    ...Typography.caption,
    color: C.textSecondary,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  hudEtaVal: {
    ...Typography.h3,
    color: C.text,
    marginTop: 2,
  },
  hudDivider: {
    width: 1,
    height: 32,
    backgroundColor: C.outlineVariant,
  },
  progressTrack: {
    height: 6,
    backgroundColor: C.surfaceLow,
    borderRadius: Rounded.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: C.primary,
    borderRadius: Rounded.full,
  },
  stopCard: {
    backgroundColor: C.surfaceLow,
    borderRadius: Rounded.xl,
    padding: Spacing.base,
    gap: Spacing.sm,
  },
  stopCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeWindowTag: {
    ...Typography.caption,
    color: C.error,
    fontWeight: '600',
  },
  stopName: {
    ...Typography.h3,
    color: C.text,
  },
  prevStopText: {
    ...Typography.caption,
    color: C.textSecondary,
  },
  stopActionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  navActionBtn: {
    flex: 1,
    height: 48,
    borderRadius: Rounded.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: C.primaryFixed,
  },
  navActionText: {
    ...Typography.buttonSmall,
    color: C.primary,
  },
  hudActionsRow: {
    marginTop: Spacing.xs,
  },
  timelineSection: {
    gap: Spacing.sm,
  },
  sectionHeading: {
    ...Typography.caption,
    fontWeight: '700',
    color: C.outline,
    letterSpacing: 0.8,
    paddingHorizontal: 4,
  },
  timeline: {
    gap: 0,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: Spacing.base,
  },
  indicatorCol: {
    alignItems: 'center',
    width: 20,
    paddingTop: 2,
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: C.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: C.outlineVariant,
  },
  timelineDotDone: {
    backgroundColor: C.secondary,
    borderColor: C.secondary,
  },
  timelineDotCurrent: {
    borderColor: C.primary,
    backgroundColor: C.primaryFixed,
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: C.outlineVariant,
    marginTop: 2,
    marginBottom: -2,
  },
  timelineLineDone: {
    backgroundColor: C.secondary,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: Spacing.lg,
    gap: 2,
  },
  timelineTitle: {
    ...Typography.bodyMedium,
    fontWeight: '600',
    color: C.text,
  },
  timelineTitleDone: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  timelineTitleCurrent: {
    color: C.primary,
    fontWeight: '700',
  },
  timelineSub: {
    ...Typography.caption,
    color: C.textSecondary,
  },
  // Overlay
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 21, 35, 0.45)',
    justifyContent: 'flex-end',
    zIndex: 20,
  },
  replanSheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: Rounded['3xl'],
    borderTopRightRadius: Rounded['3xl'],
    padding: Spacing.xl,
    gap: Spacing.base,
    ...Shadow.xl,
  },
  replanHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.outlineVariant,
    alignSelf: 'center',
  },
  replanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  replanIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.errorContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replanTitle: {
    ...Typography.h4,
    color: C.text,
  },
  replanSub: {
    ...Typography.caption,
    color: C.error,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  replanDesc: {
    ...Typography.bodyMedium,
    color: C.textSecondary,
    lineHeight: 20,
  },
  replanMetricsRow: {
    flexDirection: 'row',
    backgroundColor: C.surfaceLow,
    borderRadius: Rounded.xl,
    padding: Spacing.base,
  },
  replanMetricItem: {
    flex: 1,
    gap: 2,
  },
  replanMetricLabel: {
    ...Typography.caption,
    color: C.textSecondary,
  },
  replanMetricVal: {
    ...Typography.h4,
    color: C.text,
  },
  replanMetricDivider: {
    width: 1,
    backgroundColor: C.outlineVariant,
    marginHorizontal: Spacing.md,
  },
  replanButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
});
