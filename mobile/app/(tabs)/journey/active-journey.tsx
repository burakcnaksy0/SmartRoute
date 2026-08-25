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
import placesApi from '@/api/places';

const C = Colors.light;

function TimelineItemNode({
  stop,
  isCompleted,
  isCurrent,
  isLast,
}: {
  stop: any;
  isCompleted: boolean;
  isCurrent: boolean;
  isLast: boolean;
}) {
  const animVal = useRef(new Animated.Value(isCompleted ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animVal, {
      toValue: isCompleted ? 1 : 0,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [isCompleted]);

  const opacity = animVal.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.45],
  });

  const scale = animVal.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.95],
  });

  return (
    <Animated.View style={[styles.timelineItem, { opacity, transform: [{ scale }] }]}>
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
          <View style={[styles.timelineLine, isCompleted && styles.timelineLineDone]} />
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
    </Animated.View>
  );
}

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
    optimizeJourney,
    startJourney,
  } = useJourneyStore();

  const [poiModalVisible, setPoiModalVisible] = useState(false);
  const [poiList, setPoiList] = useState<any[]>([]);
  const [isPoiLoading, setIsPoiLoading] = useState(false);

  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number }>({
    latitude: currentJourney?.startLat ?? 41.0082,
    longitude: currentJourney?.startLng ?? 28.9784,
  });

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const p1 = lat1 * Math.PI / 180;
    const p2 = lat2 * Math.PI / 180;
    const dp = (lat2 - lat1) * Math.PI / 180;
    const dl = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    let subscription: Location.LocationSubscription;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 10 },
        (location) => {
          const coords = { latitude: location.coords.latitude, longitude: location.coords.longitude };
          setUserLocation(coords);
          
          if (currentStop) {
             const dist = getDistance(coords.latitude, coords.longitude, currentStop.lat, currentStop.lng);
             if (dist < 100) {
                 markStopAsCompleted(currentStop.id);
             }
          }
        }
      );
    })();
    return () => {
      if (subscription) subscription.remove();
    };
  }, [currentStop, markStopAsCompleted]);

  const stopsSorted = [...(currentJourney?.stops ?? [])].sort(
    (a, b) => (a.optimizedOrder ?? a.sequenceOrder) - (b.optimizedOrder ?? b.sequenceOrder)
  );

  // Add a pseudo-stop for the destination or return-to-start so it renders in the UI
  if (currentJourney?.destinationLat && currentJourney?.destinationLng) {
    stopsSorted.push({
      id: 'destination-stop',
      placeName: currentJourney.destinationAddressText || 'Hedef',
      lat: currentJourney.destinationLat,
      lng: currentJourney.destinationLng,
      visitDurationMinutes: 0,
      priority: 'normal',
      stopType: 'destination',
      sequenceOrder: 9999,
      optimizedOrder: 9999,
    });
  } else if (selectedPlan?.legs?.length > (currentJourney?.stops?.length ?? 0)) {
    // Return to start case
    stopsSorted.push({
      id: 'destination-stop',
      placeName: currentJourney?.startAddressText || 'Başlangıç (Dönüş)',
      lat: currentJourney?.startLat ?? 0,
      lng: currentJourney?.startLng ?? 0,
      visitDurationMinutes: 0,
      priority: 'normal',
      stopType: 'destination',
      sequenceOrder: 9999,
      optimizedOrder: 9999,
    });
  }

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

  const handleSearchFuel = async () => {
    setIsPoiLoading(true);
    setPoiModalVisible(true);
    const results = await placesApi.getNearby(userLocation.latitude, userLocation.longitude, 5000, 'fuel');
    setPoiList(results);
    setIsPoiLoading(false);
  };

  const handleAddFuelToRoute = async (place: any) => {
    if (!currentJourney) return;
    setPoiModalVisible(false);
    
    const uncompletedStops = (currentJourney.stops || [])
      .filter((s) => !completedStopIds.includes(s.id))
      .map(s => ({
        placeName: s.placeName,
        lat: s.lat,
        lng: s.lng,
        visitDurationMinutes: s.visitDurationMinutes,
        timeWindowStart: s.timeWindowStart,
        timeWindowEnd: s.timeWindowEnd,
        priority: s.priority as any,
        stopType: s.stopType as any
      }));
      
    uncompletedStops.push({
      placeName: place.name,
      lat: place.lat,
      lng: place.lng,
      visitDurationMinutes: 15,
      priority: 'normal',
      stopType: 'poi'
    });

    const success = await optimizeJourney(currentJourney.id, {
      startLocation: { lat: userLocation.latitude, lng: userLocation.longitude },
      stops: uncompletedStops,
      returnToStart: false
    });

    if (success) {
      startJourney();
      Alert.alert('Rotaya Eklendi', `${place.name} rotanıza başarıyla eklendi.`);
    }
  };

  // Decode route polylines
  const selectedPlan = currentJourney?.plans.find((p) => p.isSelected) || currentJourney?.plans[0];
  const polylinePoints =
    selectedPlan?.legs?.flatMap((leg) => {
      if (!leg.polylineEncoded) return [];
      return decodePolyline(leg.polylineEncoded);
    }) ?? [];

  // Real ETA calculation based on plan legs and remaining visit durations
  let remainingSeconds = 0;
  if (selectedPlan && selectedPlan.legs) {
    const remainingLegs = selectedPlan.legs.filter((leg: any) => {
      if (leg.toStopId) {
        return !completedStopIds.includes(leg.toStopId);
      } else {
        return !completedStopIds.includes('destination-stop');
      }
    });
    
    remainingSeconds = remainingLegs.reduce((acc: number, leg: any) => {
      let legTotal = leg.durationSeconds;
      if (leg.toStopId) {
        const stopObj = currentJourney?.stops?.find(s => s.id === leg.toStopId);
        legTotal += (stopObj?.visitDurationMinutes || 0) * 60;
      }
      return acc + legTotal;
    }, 0);
  }
  const remainingMinutes = Math.round(remainingSeconds / 60);
  const targetArrival = new Date(Date.now() + remainingSeconds * 1000);

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
            onPress={() => {
              Alert.alert('Yolculuğu Bitir', 'Mevcut yolculuğu sonlandırmak istediğinize emin misiniz?', [
                { text: 'Vazgeç', style: 'cancel' },
                { 
                  text: 'Bitir', 
                  style: 'destructive', 
                  onPress: () => {
                    useJourneyStore.getState().reset();
                    router.replace('/(tabs)/journey');
                  } 
                },
              ]);
            }}
            style={styles.closeBtn}
          >
            <Text style={styles.closeBtnText}>Bitir</Text>
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
                {currentStop ? `${remainingMinutes} dk` : 'Varıldı'}
              </Text>
            </View>
            <View style={styles.hudDivider} />
            <View>
              <Text style={styles.hudEtaLabel}>Hedef Varış</Text>
              <Text style={styles.hudEtaVal}>
                {targetArrival.toLocaleTimeString([], {
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
              label="Yakındaki Akaryakıt İstasyonunu Bul"
              icon="local-gas-station"
              variant="primary"
              size="md"
              fullWidth
              loading={isPoiLoading}
              onPress={handleSearchFuel}
              style={{ marginBottom: Spacing.sm }}
            />
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
                <TimelineItemNode
                  key={stop.id}
                  stop={stop}
                  isCompleted={isCompleted}
                  isCurrent={isCurrent}
                  isLast={isLast}
                />
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

      {/* POI Search Modal Overlay */}
      {poiModalVisible && (
        <View style={styles.overlayBg}>
          <View style={styles.replanSheet}>
            <View style={styles.replanHandle} />
            <View style={styles.replanHeader}>
              <View style={[styles.replanIconBg, { backgroundColor: C.primaryFixed }]}>
                <MaterialIcons name="local-gas-station" size={24} color={C.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.replanTitle}>Yakındaki İstasyonlar</Text>
                <Text style={styles.replanSub}>Aracınız için en yakın seçenekler</Text>
              </View>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              {poiList.map((poi, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.poiItem}
                  onPress={() => handleAddFuelToRoute(poi)}
                >
                  <MaterialIcons name="local-gas-station" size={24} color={C.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.poiName}>{poi.name}</Text>
                    <Text style={styles.poiAddr}>{poi.vicinity}</Text>
                  </View>
                  <MaterialIcons name="add-circle-outline" size={24} color={C.secondary} />
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Button label="Kapat" variant="secondary" size="md" onPress={() => setPoiModalVisible(false)} />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF8FF',
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
    borderColor: 'rgba(255,255,255,0.8)',
    ...Shadow.md,
  },
  hudSheet: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: Rounded['2xl'],
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadow.xl,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  hudHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    padding: Spacing.sm,
    borderRadius: Rounded.xl,
  },
  hudEtaLabel: {
    ...Typography.caption,
    color: C.onSurfaceVariant,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  hudEtaVal: {
    ...Typography.h3,
    color: C.onSurface,
    marginTop: 2,
  },
  hudDivider: {
    width: 1,
    height: 32,
    backgroundColor: C.outlineVariant,
    opacity: 0.5,
  },
  progressTrack: {
    height: 8,
    backgroundColor: 'rgba(59, 53, 208, 0.1)',
    borderRadius: Rounded.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: C.primary,
    borderRadius: Rounded.full,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },
  stopCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: Rounded.xl,
    padding: Spacing.base,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
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
    color: C.onSurface,
  },
  prevStopText: {
    ...Typography.caption,
    color: C.onSurfaceVariant,
  },
  stopActionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  navActionBtn: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 10,
    borderRadius: Rounded.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(59, 53, 208, 0.1)',
  },
  navActionText: {
    ...Typography.buttonSmall,
    color: C.primary,
    flexShrink: 1,
    textAlign: 'center',
  },
  hudActionsRow: {
    marginTop: Spacing.xs,
  },
  timelineSection: {
    gap: Spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: Rounded['2xl'],
    padding: Spacing.md,
  },
  sectionHeading: {
    ...Typography.labelCaps,
    color: C.outline,
    paddingHorizontal: 4,
    marginBottom: 4,
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
    width: 24,
    paddingTop: 2,
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.8)',
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
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: C.outlineVariant,
    marginTop: 2,
    marginBottom: -2,
    opacity: 0.5,
  },
  timelineLineDone: {
    backgroundColor: C.secondary,
    opacity: 1,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: Spacing.lg,
    gap: 2,
  },
  timelineTitle: {
    ...Typography.bodyMedium,
    fontWeight: '600',
    color: C.onSurface,
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
    color: C.onSurfaceVariant,
  },
  // Overlay
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(250, 248, 255, 0.65)',
    justifyContent: 'flex-end',
    zIndex: 20,
  },
  replanSheet: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopLeftRadius: Rounded['3xl'],
    borderTopRightRadius: Rounded['3xl'],
    padding: Spacing.xl,
    gap: Spacing.base,
    ...Shadow.xl,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.8)',
  },
  replanHandle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: C.outlineVariant,
    alignSelf: 'center',
    opacity: 0.5,
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
  },
  replanTitle: {
    ...Typography.h3,
    color: C.onSurface,
  },
  replanSub: {
    ...Typography.caption,
    color: C.error,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  replanDesc: {
    ...Typography.bodyMedium,
    color: C.onSurfaceVariant,
    lineHeight: 22,
  },
  replanMetricsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(238, 240, 247, 0.5)',
    borderRadius: Rounded.xl,
    padding: Spacing.md,
  },
  replanMetricItem: {
    flex: 1,
    gap: 4,
  },
  replanMetricLabel: {
    ...Typography.caption,
    color: C.onSurfaceVariant,
  },
  replanMetricVal: {
    ...Typography.h4,
    color: C.onSurface,
  },
  replanMetricDivider: {
    width: 1,
    backgroundColor: C.outlineVariant,
    marginHorizontal: Spacing.md,
    opacity: 0.3,
  },
  replanButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
});
