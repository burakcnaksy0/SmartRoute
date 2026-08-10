import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { decodePolyline } from '@/utils/polyline';
import { useJourneyStore } from '@/store/journeyStore';
import { Colors, Spacing, Rounded, Shadow, Typography, TabBarHeight } from '@/constants/theme';
import { ScreenHeader } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/States';

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

  const [gpsMode, setGpsMode] = useState<'normal' | 'weak'>('normal');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    let subscription: any = null;

    async function startLocationTracking() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Location permission denied');
          return;
        }

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 5000,
            distanceInterval: 10,
          },
          (location) => {
            setUserLocation({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            });
          }
        );
      } catch (err) {
        console.warn('Error starting location tracking:', err);
      }
    }

    startLocationTracking();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  const stopsSorted = [...(currentJourney?.stops ?? [])].sort(
    (a, b) => (a.optimizedOrder ?? a.sequenceOrder) - (b.optimizedOrder ?? b.sequenceOrder)
  );
  const currentStop = stopsSorted.find(s => !completedStopIds.includes(s.id));
  const isStopCritical = currentStop?.priority === 'critical';

  const getSimulatedCoordinates = () => {
    if (!currentJourney) return { lat: 41.01, lng: 28.97 };
    let lat = currentJourney.startLat;
    let lng = currentJourney.startLng;
    if (completedStopIds.length > 0) {
      const lastStop = currentJourney.stops.find(
        s => s.id === completedStopIds[completedStopIds.length - 1]
      );
      if (lastStop) {
        if (gpsMode === 'normal' && currentStop) {
          lat = lastStop.lat + (currentStop.lat - lastStop.lat) * 0.1;
          lng = lastStop.lng + (currentStop.lng - lastStop.lng) * 0.1;
        } else {
          lat = lastStop.lat;
          lng = lastStop.lng;
        }
      }
    } else if (currentStop && gpsMode === 'normal') {
      lat = currentJourney.startLat + (currentStop.lat - currentJourney.startLat) * 0.1;
      lng = currentJourney.startLng + (currentStop.lng - currentJourney.startLng) * 0.1;
    }
    return { lat, lng };
  };

  const handleOpenNavigation = () => {
    if (!currentStop) return;
    const url = Platform.OS === 'ios'
      ? `maps://?q=${currentStop.lat},${currentStop.lng}`
      : `geo:${currentStop.lat},${currentStop.lng}?q=${currentStop.lat},${currentStop.lng}`;
    Linking.canOpenURL(url).then(supported => {
      if (supported) Linking.openURL(url);
      else Alert.alert('Hata', 'Harita uygulaması açılamadı.');
    });
  };

  const handleArrived = () => {
    if (currentStop) markStopAsCompleted(currentStop.id);
  };

  const handleSimulateTrafficChange = async () => {
    const { lat, lng } = getSimulatedCoordinates();
    const suggested = await triggerReplan(lat, lng);
    if (!suggested) {
      Alert.alert('Güzergah Durumu', 'Rotanızda önemli bir trafik yoğunluğu değişikliği tespit edilmedi.');
    }
  };

  const handleConfirmReplan = async () => {
    const { lat, lng } = getSimulatedCoordinates();
    const success = await confirmReplan(lat, lng);
    if (success) Alert.alert('Güncellendi', 'Rotanız başarıyla yeniden optimize edildi!');
  };

  // Completed state
  if (!currentJourney || currentJourney.status === 'completed') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <EmptyState
          icon="emoji-events"
          title="Seyahat Tamamlandı! 🎉"
          description="Harika iş! Optimize edilmiş rotanızdaki tüm duraklara ulaştınız."
          iconColor={C.secondary}
          iconBg={C.secondaryContainer}
          actionLabel="Panoya Dön"
          onAction={() => router.replace('/(tabs)/journey')}
          style={{ flex: 1 }}
        />
      </SafeAreaView>
    );
  }

  const completedCount = completedStopIds.length;
  const totalCount = stopsSorted.length;
  const progressPct = totalCount > 0 ? completedCount / totalCount : 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <ScreenHeader
        title="Aktif Seyahat"
        showBack={false}
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
        {/* Active Journey Interactive Map */}
        <View style={[styles.mapCardView, { borderColor: C.surfaceContainer }]}>
          {Platform.OS !== 'web' ? (
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: currentJourney.startLat,
                longitude: currentJourney.startLng,
                latitudeDelta: 0.15,
                longitudeDelta: 0.15,
              }}
            >
              {/* User location marker if available */}
              {userLocation && (
                <Marker
                  coordinate={userLocation}
                  title="Mevcut Konumunuz"
                  pinColor="blue"
                />
              )}

              {/* Start location marker */}
              <Marker
                coordinate={{ latitude: currentJourney.startLat, longitude: currentJourney.startLng }}
                title="Başlangıç"
                pinColor="green"
              />

              {/* Stops markers */}
              {stopsSorted.map((stop, idx) => (
                <Marker
                  key={stop.id}
                  coordinate={{ latitude: stop.lat, longitude: stop.lng }}
                  title={`${idx + 1}. ${stop.placeName}`}
                  pinColor={
                    completedStopIds.includes(stop.id)
                      ? 'grey'
                      : stop.priority === 'critical'
                      ? 'red'
                      : 'orange'
                  }
                />
              ))}

              {/* Selected Plan Legs Polylines */}
              {(currentJourney.plans.find(p => p.isSelected) || currentJourney.plans[0])?.legs.map((leg, legIdx) => {
                if (!leg.polylineEncoded) return null;
                const points = decodePolyline(leg.polylineEncoded);
                return (
                  <Polyline
                    key={legIdx}
                    coordinates={points}
                    strokeColor={C.primary}
                    strokeWidth={4}
                  />
                );
              })}
            </MapView>
          ) : (
            <View style={styles.webMapPlaceholder}>
              <MaterialIcons name="map" size={32} color={C.outline} />
              <Text style={{ color: C.outline, marginTop: 8, fontSize: 13 }}>Web platformunda harita gösterimi simüle edilmiştir.</Text>
            </View>
          )}
        </View>

        {/* Progress indicator */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>
              Durak {completedCount + (currentStop ? 1 : 0)} / {totalCount}
            </Text>
            <Text style={styles.progressPct}>%{Math.round(progressPct * 100)} tamamlandı</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct * 100}%` }]} />
          </View>
        </View>

        {/* Current stop card */}
        {currentStop ? (
          <View
            style={[
              styles.currentCard,
              isStopCritical && styles.currentCardCritical,
            ]}
          >
            <View style={styles.currentCardTop}>
              <View style={styles.badgeRow}>
                {isStopCritical
                  ? <Badge label="Kritik Durak" variant="error" size="sm" />
                  : <Badge label="Sıradaki Hedef" variant="primary" size="sm" />
                }
              </View>
            </View>

            <Text style={styles.stopName} numberOfLines={2}>
              {currentStop.placeName}
            </Text>

            {currentStop.timeWindowEnd && (
              <View style={styles.timeWindow}>
                <MaterialIcons
                  name="schedule"
                  size={14}
                  color={isStopCritical ? C.error : C.textSecondary}
                />
                <Text style={[
                  styles.timeWindowText,
                  isStopCritical && { color: C.error, fontWeight: '600' },
                ]}>
                  Hedef: En geç{' '}
                  {new Date(currentStop.timeWindowEnd).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            )}

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.navBtn}
                onPress={handleOpenNavigation}
                activeOpacity={0.8}
              >
                <MaterialIcons name="explore" size={18} color={C.primary} />
                <Text style={styles.navBtnText}>Navigasyon</Text>
              </TouchableOpacity>
              <Button
                label="Varıldı ✓"
                variant="secondary"
                size="md"
                onPress={handleArrived}
                style={{ flex: 1, backgroundColor: C.secondary }}
                labelStyle={{ color: C.onSecondary }}
              />
            </View>
          </View>
        ) : (
          <View style={styles.currentCard}>
            <MaterialIcons name="check-circle" size={32} color={C.secondary} />
            <Text style={styles.allDoneText}>Tüm duraklar tamamlandı!</Text>
          </View>
        )}

        {/* Simulation toolkit */}
        <View style={styles.simPanel}>
          <View style={styles.simHeader}>
            <MaterialIcons name="science" size={16} color={C.tertiary} />
            <Text style={styles.simTitle}>Simülasyon Paneli</Text>
          </View>
          <Text style={styles.simDesc}>
            Farklı GPS ve trafik koşullarında platform davranışını test edin.
          </Text>

          <View style={styles.gpsToggleRow}>
            <Text style={styles.simLabel}>GPS Sinyali</Text>
            <View style={styles.segmented}>
              {(['normal', 'weak'] as const).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[styles.segBtn, gpsMode === mode && styles.segBtnActive]}
                  onPress={() => setGpsMode(mode)}
                >
                  <Text style={[
                    styles.segBtnText,
                    gpsMode === mode && styles.segBtnTextActive,
                    mode === 'weak' && gpsMode === mode && { color: C.error },
                  ]}>
                    {mode === 'normal' ? 'Normal' : 'Zayıf (LKL)'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Button
            label="Rota Yoğunluğunu Analiz Et"
            icon="traffic"
            variant="primary"
            size="md"
            fullWidth
            loading={isReplanLoading}
            onPress={handleSimulateTrafficChange}
            style={{ marginTop: Spacing.sm }}
          />
        </View>

        {/* Timeline */}
        <View style={styles.timelineSection}>
          <Text style={styles.timelineTitle}>YOLCULUK İLERLEMESİ</Text>
          <View style={styles.timeline}>
            {stopsSorted.map((stop, idx) => {
              const isCompleted = completedStopIds.includes(stop.id);
              const isCurrent = currentStop?.id === stop.id;
              const isLast = idx === stopsSorted.length - 1;

              return (
                <View key={stop.id} style={styles.timelineItem}>
                  {/* Indicator */}
                  <View style={styles.indicatorCol}>
                    <View style={[
                      styles.dot,
                      isCompleted && styles.dotDone,
                      isCurrent && styles.dotCurrent,
                    ]}>
                      {isCompleted && (
                        <MaterialIcons name="done" size={10} color={C.onSecondary} />
                      )}
                    </View>
                    {!isLast && (
                      <View style={[styles.line, isCompleted && styles.lineDone]} />
                    )}
                  </View>
                  {/* Content */}
                  <View style={styles.timelineContent}>
                    <Text style={[
                      styles.stopName2,
                      isCompleted && styles.stopNameDone,
                      isCurrent && styles.stopNameCurrent,
                    ]}>
                      {stop.placeName}
                    </Text>
                    <Text style={styles.stopMeta}>
                      {isCompleted
                        ? 'Tamamlandı'
                        : stop.priority === 'critical'
                        ? `⚠ Kritik · ${stop.visitDurationMinutes} dk`
                        : `${stop.visitDurationMinutes} dk ziyaret`}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Replan overlay */}
      {replanSuggested && (
        <View style={styles.overlayBg}>
          <View style={styles.replanPanel}>
            {/* Handle bar */}
            <View style={styles.handleBar} />

            <View style={styles.replanHeader}>
              <View style={styles.replanIconBg}>
                <MaterialIcons name="traffic" size={24} color={C.error} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.replanTitle}>Trafik Yoğunluğu Uyarısı</Text>
                <Text style={styles.replanSubtitle}>Güzergah Değişikliği Algılandı</Text>
              </View>
            </View>

            <Text style={styles.replanMessage}>{replanMessage}</Text>

            {proposedPlan && (
              <View style={styles.replanMetrics}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Yeni Süre</Text>
                  <Text style={styles.metricValue}>
                    {Math.floor(proposedPlan.totalDurationSeconds / 60)} dk
                  </Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Tahmin Maliyet</Text>
                  <Text style={[styles.metricValue, { color: C.secondary }]}>
                    {(proposedPlan.totalFuelCostEstimate ?? 0).toFixed(2)} TL
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.replanActions}>
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
    gap: Spacing.xl,
    paddingBottom: TabBarHeight + Spacing['2xl'],
  },
  // Progress
  progressSection: {
    gap: Spacing.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    ...Typography.label,
    color: C.textSecondary,
  },
  progressPct: {
    ...Typography.label,
    color: C.primary,
  },
  progressTrack: {
    height: 6,
    backgroundColor: C.surfaceContainerHigh,
    borderRadius: Rounded.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: C.primary,
    borderRadius: Rounded.full,
  },
  // Current stop card
  currentCard: {
    backgroundColor: C.surface,
    borderRadius: Rounded.xl,
    padding: Spacing.xl,
    gap: Spacing.md,
    ...Shadow.md,
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  currentCardCritical: {
    borderColor: C.error,
    borderWidth: 1.5,
    backgroundColor: '#FDFCFC',
  },
  currentCardTop: {
    flexDirection: 'row',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  stopName: {
    ...Typography.h2,
    color: C.text,
  },
  timeWindow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  timeWindowText: {
    ...Typography.bodySmall,
    color: C.textSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  navBtn: {
    flex: 1,
    height: 48,
    borderRadius: Rounded.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: C.primaryFixed,
  },
  navBtnText: {
    ...Typography.buttonSmall,
    color: C.primary,
  },
  allDoneText: {
    ...Typography.h4,
    color: C.text,
    textAlign: 'center',
  },
  // Sim panel
  simPanel: {
    backgroundColor: C.surfaceLow,
    borderRadius: Rounded.xl,
    padding: Spacing.base,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  simHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  simTitle: {
    ...Typography.bodyMedium,
    color: C.tertiary,
    fontWeight: '700',
  },
  simDesc: {
    ...Typography.bodySmall,
    color: C.textSecondary,
    lineHeight: 18,
  },
  gpsToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  simLabel: {
    ...Typography.bodyMedium,
    color: C.text,
    fontWeight: '600',
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: C.surfaceContainerHigh,
    borderRadius: Rounded.lg,
    padding: 3,
    gap: 2,
  },
  segBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Rounded.md,
  },
  segBtnActive: {
    backgroundColor: C.surface,
    ...Shadow.sm,
  },
  segBtnText: {
    ...Typography.caption,
    color: C.outline,
    fontWeight: '600',
  },
  segBtnTextActive: {
    color: C.text,
  },
  // Timeline
  timelineSection: {
    gap: Spacing.base,
  },
  timelineTitle: {
    ...Typography.labelCaps,
    color: C.outline,
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
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: C.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    borderWidth: 1.5,
    borderColor: C.outlineVariant,
  },
  dotDone: {
    backgroundColor: C.secondary,
    borderColor: C.secondary,
  },
  dotCurrent: {
    borderColor: C.primary,
    backgroundColor: C.primaryFixed,
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: C.outlineVariant,
    marginTop: 2,
    marginBottom: -2,
  },
  lineDone: {
    backgroundColor: C.secondary,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: Spacing.xl,
    gap: 3,
  },
  stopName2: {
    ...Typography.bodyMedium,
    color: C.outline,
    fontWeight: '500',
  },
  stopNameDone: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  stopNameCurrent: {
    color: C.text,
    fontWeight: '700',
  },
  stopMeta: {
    ...Typography.caption,
    color: C.outline,
  },
  // Replan overlay
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 21, 35, 0.45)',
    justifyContent: 'flex-end',
    zIndex: 20,
  },
  replanPanel: {
    backgroundColor: C.surface,
    borderTopLeftRadius: Rounded['3xl'],
    borderTopRightRadius: Rounded['3xl'],
    padding: Spacing.xl,
    paddingTop: Spacing.base,
    gap: Spacing.base,
    ...Shadow.xl,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.outlineVariant,
    alignSelf: 'center',
    marginBottom: Spacing.sm,
  },
  replanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  replanIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.errorContainer,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  replanTitle: {
    ...Typography.h4,
    color: C.text,
  },
  replanSubtitle: {
    ...Typography.caption,
    color: C.error,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  replanMessage: {
    ...Typography.body,
    color: C.textSecondary,
    lineHeight: 22,
  },
  replanMetrics: {
    flexDirection: 'row',
    backgroundColor: C.surfaceLow,
    borderRadius: Rounded.xl,
    padding: Spacing.base,
  },
  metricItem: {
    flex: 1,
    gap: 4,
  },
  metricLabel: {
    ...Typography.caption,
    color: C.textSecondary,
  },
  metricValue: {
    ...Typography.h4,
    color: C.text,
  },
  metricDivider: {
    width: 1,
    backgroundColor: C.outlineVariant,
    marginHorizontal: Spacing.md,
  },
  replanActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing.base,
  },
  mapCardView: {
    height: 220,
    borderRadius: Rounded.xl,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  webMapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
});
