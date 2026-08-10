import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { decodePolyline } from '@/utils/polyline';
import { useJourneyStore } from '@/store/journeyStore';
import { useVehicleStore } from '@/store/vehicleStore';
import StopList, { StopListItem } from '@/components/StopList';
import { Colors, Spacing, Rounded, Shadow } from '@/constants/theme';
import ExplainabilityBadge from '@/components/ExplainabilityBadge';
import SocSlider from '@/components/SocSlider';
import { ScreenHeader } from '@/components/ui/Header';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h} sa ${m} dk`;
  return `${m} dk`;
}

function formatDistance(meters: number): string {
  const km = meters / 1000;
  return `${km.toFixed(1)} km`;
}

function formatCost(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return '₺0,00';
  return `₺${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const PLAN_META: Record<string, { title: string; subtitle: string; icon: keyof typeof MaterialIcons.glyphMap; color: string; bg: string }> = {
  recommended: { title: 'Önerilen', subtitle: 'En Dengeli', icon: 'star', color: '#006C49', bg: '#6CF8BB18' },
  fastest:     { title: 'En Hızlı', subtitle: 'En Kısa Süre', icon: 'bolt', color: '#2A14B4', bg: '#E3DFFF' },
  cheapest:    { title: 'En Ekonomik', subtitle: 'Eko Rota', icon: 'payments', color: '#553300', bg: '#FFDDB8' },
};

export default function PlanResultScreen() {
  const router = useRouter();
  const colors = Colors.light;
  const { currentJourney, isLoading, error, infeasibleConflictingStops, reorderStops } = useJourneyStore();
  const { defaultVehicle, currentSocPercent, setSocPercent } = useVehicleStore();

  const isEvVehicle = defaultVehicle?.fuelType === 'electric' || defaultVehicle?.fuelType === 'plugin_hybrid';

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isManualOverride, setIsManualOverride] = useState(false);
  const [stopOrder, setStopOrder] = useState<StopListItem[]>([]);
  const [showMapSelector, setShowMapSelector] = useState(false);

  // Initialize selected plan and stop order from current journey
  useEffect(() => {
    if (currentJourney) {
      const recommended = currentJourney.plans.find(p => p.planLabel === 'recommended');
      if (recommended) setSelectedPlanId(recommended.id);
      else if (currentJourney.plans.length > 0) setSelectedPlanId(currentJourney.plans[0].id);

      // Build stop list from journey stops, ordered by optimizedOrder
      const sorted = [...(currentJourney.stops ?? [])].sort(
        (a, b) => (a.optimizedOrder ?? a.sequenceOrder) - (b.optimizedOrder ?? b.sequenceOrder)
      );
      setStopOrder(sorted.map(s => ({
        id: s.id,
        placeName: s.placeName,
        visitDurationMinutes: s.visitDurationMinutes,
        priority: s.priority as StopListItem['priority'],
        stopType: s.stopType,
        timeWindowStart: s.timeWindowStart,
        timeWindowEnd: s.timeWindowEnd,
        optimizedOrder: s.optimizedOrder,
        hasTimeWindowRisk: checkTimeWindowRisk(s),
      })));
    }
  }, [currentJourney]);

  function checkTimeWindowRisk(stop: any): boolean {
    if (!stop.timeWindowEnd) return false;
    if (stop.priority !== 'critical' && stop.priority !== 'high') return false;
    return (stop.optimizedOrder ?? stop.sequenceOrder) > 1;
  }

  const handleReorder = useCallback((newOrder: StopListItem[]) => {
    setStopOrder(newOrder);
    reorderStops?.(newOrder.map(s => s.id!));
  }, [reorderStops]);

  const selectedPlan = currentJourney?.plans.find(p => p.id === selectedPlanId);
  const hasCriticalRisk = stopOrder.some(s => s.hasTimeWindowRisk && s.priority === 'critical');

  const openExternalMap = (provider: 'apple' | 'osm') => {
    setShowMapSelector(false);
    if (!selectedPlan || !currentJourney) return;

    const start = `${currentJourney.startLat},${currentJourney.startLng}`;
    const destination = currentJourney.stops.length > 0 
      ? `${currentJourney.stops[currentJourney.stops.length - 1].lat},${currentJourney.stops[currentJourney.stops.length - 1].lng}`
      : start;

    const waypoints = currentJourney.stops.slice(0, -1).map(s => `${s.lat},${s.lng}`).join('|');

    let url = '';
    if (provider === 'apple') {
      url = `http://maps.apple.com/?saddr=${start}&daddr=${destination}`;
      if (waypoints) {
        url += `&daddr=${waypoints}|${destination}`;
      }
    } else {
      // OpenStreetMap directions (works in any browser, no API key)
      const startParts = start.split(',');
      const destParts = destination.split(',');
      url = `https://www.openstreetmap.org/directions?engine=osrm_car&route=${startParts[0]},${startParts[1]};${destParts[0]},${destParts[1]}`;
    }
    
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        console.warn("Can't open map URL", url);
      }
    });
  };

  // ── INFEASIBLE error state ─────────────────────────────────────────────────
  if (error && (error.includes('çakış') || error.includes('infeasible') || error.includes('çözülemedi'))) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="dark-content" />
        <ScreenHeader title="Rota Oluşturulamadı" />
        <View style={styles.errorContainer}>
          <View style={[styles.errorIconBg, { backgroundColor: colors.errorContainer }]}>
            <MaterialIcons name="warning" size={44} color={colors.error} />
          </View>
          <Text style={[styles.errorTitle, { color: colors.onSurface }]}>Zaman Pencereleri Çakışması</Text>
          <Text style={[styles.errorMessage, { color: colors.outline }]}>{error}</Text>
          {infeasibleConflictingStops && infeasibleConflictingStops.length > 0 && (
            <View style={[styles.conflictBox, { backgroundColor: colors.errorContainer + '15', borderColor: colors.error }]}>
              <Text style={[styles.conflictLabel, { color: colors.error }]}>Çakışan Duraklar:</Text>
              {infeasibleConflictingStops.map((name, i) => (
                <Text key={i} style={[styles.conflictStop, { color: colors.onSurface }]}>• {name}</Text>
              ))}
            </View>
          )}
          <TouchableOpacity 
            style={[styles.editConstraintsBtn, { backgroundColor: colors.primary }]} 
            onPress={() => router.back()}
          >
            <Text style={[styles.editConstraintsBtnText, { color: colors.onPrimary }]}>Kısıtlamaları Düzenle</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading || !currentJourney) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.outline }]}>Canlı trafik değerlendiriliyor ve en uygun rotalar hesaplanıyor...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" />
      <ScreenHeader title="Yolculuk Alternatifleri" />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Critical stop risk alert banner */}
        {hasCriticalRisk && (
          <View style={[styles.riskAlert, { backgroundColor: colors.errorContainer + '15', borderColor: colors.error }]}>
            <View style={styles.riskAlertHeader}>
              <MaterialIcons name="warning" size={18} color={colors.error} />
              <Text style={[styles.riskAlertTitle, { color: colors.error }]}>Zaman Penceresi İhlal Riski</Text>
            </View>
            <Text style={[styles.riskAlertText, { color: colors.error }]}>
              Kritik bir durak için varış penceresini kaçırma olasılığı yüksek. Lütfen öncelikleri ayarlayın veya saatleri kaydırın.
            </Text>
          </View>
        )}
        {/* Interactive Map View */}
        {selectedPlan && (
          <View style={[styles.mapCardView, { backgroundColor: colors.surface, borderColor: colors.surfaceContainer }]}>
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
                <Marker
                  coordinate={{ latitude: currentJourney.startLat, longitude: currentJourney.startLng }}
                  title="Başlangıç Noktası"
                  pinColor="green"
                />
                {currentJourney.stops.map((stop, idx) => (
                  <Marker
                    key={stop.id}
                    coordinate={{ latitude: stop.lat, longitude: stop.lng }}
                    title={`${idx + 1}. ${stop.placeName}`}
                    pinColor={stop.priority === 'critical' ? 'red' : 'blue'}
                  />
                ))}
                {selectedPlan.legs.map((leg, legIdx) => {
                  if (!leg.polylineEncoded) return null;
                  const points = decodePolyline(leg.polylineEncoded);
                  return (
                    <Polyline
                      key={legIdx}
                      coordinates={points}
                      strokeColor={colors.primary}
                      strokeWidth={4}
                    />
                  );
                })}
              </MapView>
            ) : (
              <View style={styles.webMapPlaceholder}>
                <MaterialIcons name="map" size={32} color={colors.outline} />
                <Text style={{ color: colors.outline, marginTop: 8, fontSize: 13 }}>Web platformunda harita gösterimi simüle edilmiştir.</Text>
              </View>
            )}
          </View>
        )}

        {/* Plan Selectors */}
        <Text style={[styles.sectionLabel, { color: colors.outline }]}>Rota Seçeneği Seçin</Text>
        {currentJourney.plans.map(plan => {
          const isNeutral = plan.explanationText && (plan.explanationText.includes('Rotalar oldukça benzer') || plan.explanationText.includes('benzer'));
          let meta = PLAN_META[plan.planLabel] ?? { title: plan.planLabel, subtitle: 'Alternatif', icon: 'map', color: colors.outline, bg: colors.surfaceLow };
          if (isNeutral && plan.planLabel === 'recommended') {
            meta = { title: 'Dengeli', subtitle: 'Alternatif', icon: 'map', color: colors.outline, bg: colors.surfaceLow };
          }
          const isSelected = plan.id === selectedPlanId;
          const totalCost = (plan.totalTollCost ?? 0) + (plan.totalFuelCostEstimate ?? 0);

          return (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planCard,
                { backgroundColor: colors.surface, borderColor: 'rgba(0, 0, 0, 0.04)' },
                isSelected && [styles.planCardSelected, { borderColor: colors.primary }],
              ]}
              onPress={() => setSelectedPlanId(plan.id)}
              activeOpacity={0.85}
            >
              <View style={styles.planCardHeader}>
                <View style={[styles.planBadge, { backgroundColor: meta.bg }]}>
                  <MaterialIcons name={meta.icon} size={16} color={meta.color} />
                  <Text style={[styles.planBadgeText, { color: meta.color }]}>
                    {meta.title}
                  </Text>
                </View>
                {isSelected && (
                  <View style={[styles.selectedDot, { backgroundColor: colors.primary }]} />
                )}
              </View>

              <View style={styles.planMetrics}>
                <View style={styles.metric}>
                  <Text style={[styles.metricValue, { color: colors.onSurface }]}>
                    {formatDuration(plan.totalDurationSeconds)}
                  </Text>
                  <Text style={[styles.metricLabel, { color: colors.outline }]}>Süre</Text>
                </View>
                <View style={[styles.metricDivider, { backgroundColor: colors.surfaceContainer }]} />
                <View style={styles.metric}>
                  <Text style={[styles.metricValue, { color: colors.onSurface }]}>
                    {formatDistance(plan.totalDistanceMeters)}
                  </Text>
                  <Text style={[styles.metricLabel, { color: colors.outline }]}>Mesafe</Text>
                </View>
                <View style={[styles.metricDivider, { backgroundColor: colors.surfaceContainer }]} />
                <View style={styles.metric}>
                  <Text style={[styles.metricValue, { color: colors.secondary }]}>
                    {formatCost(totalCost)}
                  </Text>
                  <Text style={[styles.metricLabel, { color: colors.outline }]}>Tahmini Maliyet</Text>
                </View>
              </View>

              {/* Traffic Risk indicator */}
              {plan.trafficRiskScore != null && (
                <View style={styles.trafficRow}>
                  <MaterialIcons 
                    name="traffic" 
                    size={16} 
                    color={plan.trafficRiskScore < 0.3 ? colors.secondary : plan.trafficRiskScore < 0.6 ? colors.tertiary : colors.error} 
                  />
                  <Text style={[styles.trafficLabel, { color: colors.outline }]}>
                    Trafik Yoğunluğu: {plan.trafficRiskScore < 0.3 ? 'Açık' : plan.trafficRiskScore < 0.6 ? 'Orta' : 'Yoğun'}
                  </Text>
                </View>
              )}

              {/* EV Charging Stop Badge (UX §11.5) */}
              {plan.requiresChargingStop && (
                <View style={styles.evChargingBadge}>
                  <Text style={styles.evChargingIcon}>🔋</Text>
                  <Text style={styles.evChargingText}>
                    {plan.chargingStopCount === 1
                      ? '1 şarj molası gerekiyor'
                      : `${plan.chargingStopCount ?? 1} şarj molası gerekiyor`}
                  </Text>
                </View>
              )}

              {/* Explanation Text */}
              {plan.explanationText && (
                <ExplainabilityBadge explanationText={plan.explanationText} />
              )}
            </TouchableOpacity>
          );
        })}

        {/* SoC Slider for EV vehicles (UX §6.14) */}
        {isEvVehicle && (
          <View style={[styles.socCard, { backgroundColor: colors.surface }]}>
            <SocSlider
              value={currentSocPercent}
              onChange={setSocPercent}
            />
          </View>
        )}

        {/* Selected Plan Details & Stop Order Reordering */}
        {selectedPlan && (
          <View style={styles.detailsContainer}>
            {/* Route Insight Card */}
            <View style={[styles.insightCard, { backgroundColor: colors.surfaceLow }]}>
              <View style={[styles.insightIconContainer, { backgroundColor: colors.secondaryContainer }]}>
                <MaterialIcons name="insights" size={20} color={colors.onSecondaryContainer} />
              </View>
              <View style={styles.insightContent}>
                <Text style={[styles.insightLabel, { color: colors.onSurface }]}>Rota Analizi</Text>
                <Text style={[styles.insightText, { color: colors.onSurfaceVariant }]}>
                  {selectedPlan.explanationText || 'Bu rota trafik modellerini optimize eder ve kritik durak pencerelerinize öncelik verir.'}
                </Text>
              </View>
            </View>

            <Text style={[styles.sectionLabel, { color: colors.outline }]}>Durak Listesi</Text>
            <StopList
              stops={stopOrder}
              onReorder={handleReorder}
              onEditStop={(i) => router.push({
                pathname: '/(tabs)/journey/stop-detail' as any,
                params: { stopIndex: String(i) },
              })}
              onDeleteStop={(i) => {
                const next = stopOrder.filter((_, idx) => idx !== i);
                setStopOrder(next);
              }}
              showOptimizedOrderHint={true}
              isManualOverride={isManualOverride}
              onToggleManualOverride={() => setIsManualOverride(v => !v)}
            />
          </View>
        )}
      </ScrollView>

      {/* Sticky Bottom Actions */}
      {selectedPlan && (
        <View style={[styles.footer, { backgroundColor: 'rgba(255, 255, 255, 0.9)', borderTopColor: 'rgba(0, 0, 0, 0.04)' }]}>
          <View style={styles.footerRow}>
            <TouchableOpacity 
              style={[styles.moreBtn, { backgroundColor: colors.surfaceContainerHigh }]}
              onPress={() => setShowMapSelector(prev => !prev)}
            >
              <MaterialIcons name="more-vert" size={24} color={colors.onSurface} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.ctaBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.85}
              onPress={() => setShowMapSelector(true)}
            >
              <MaterialIcons name="navigation" size={20} color={colors.onPrimary} />
              <Text style={[styles.ctaBtnText, { color: colors.onPrimary }]}>
                Navigasyonu Başlat
              </Text>
            </TouchableOpacity>
          </View>

          {/* Map choice popover */}
          {showMapSelector && (
            <View style={[styles.mapOptionsPopover, { backgroundColor: colors.surface }]}>
              <TouchableOpacity style={styles.popoverItem} onPress={() => openExternalMap('apple')}>
                <MaterialIcons name="map" size={20} color={colors.primary} />
                <Text style={[styles.popoverText, { color: colors.onSurface }]}>Apple Haritalar ile Aç</Text>
              </TouchableOpacity>
              <View style={[styles.popoverDivider, { backgroundColor: colors.surfaceContainer }]} />
              <TouchableOpacity style={styles.popoverItem} onPress={() => openExternalMap('osm')}>
                <MaterialIcons name="explore" size={20} color={colors.primary} />
                <Text style={[styles.popoverText, { color: colors.onSurface }]}>OpenStreetMap ile Aç</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
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
    paddingBottom: 120, // Cushion for the sticky footer
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 4,
    marginBottom: Spacing.stackSm,
    marginTop: Spacing.stackLg,
  },
  riskAlert: {
    borderRadius: Rounded.xl,
    padding: 14,
    borderWidth: 1,
    gap: 6,
    marginBottom: 8,
  },
  riskAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  riskAlertTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  riskAlertText: {
    fontSize: 13,
    lineHeight: 18,
  },
  mapCardView: {
    height: 220,
    borderRadius: Rounded.xl,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: Spacing.stackMd,
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
  planCard: {
    borderRadius: Rounded.xl,
    padding: 16,
    borderWidth: 1.5,
    marginBottom: Spacing.stackMd,
    shadowColor: 'rgba(0, 0, 0, 0.02)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 1,
  },
  planCardSelected: {
    borderWidth: 2,
    shadowColor: 'rgba(42, 20, 180, 0.08)',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
  },
  planCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Rounded.full,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  planBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  selectedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  planMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  metricDivider: {
    width: 1,
    height: 36,
  },
  trafficRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  trafficLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  explanation: {
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
    marginTop: 10,
  },
  evChargingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignSelf: 'flex-start',
  },
  evChargingIcon: {
    fontSize: 13,
  },
  evChargingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  socCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  detailsContainer: {
    marginTop: Spacing.stackMd,
  },
  insightCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: Rounded.xl,
    marginBottom: Spacing.stackLg,
    gap: 12,
    shadowColor: 'rgba(0, 0, 0, 0.01)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  insightIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightContent: {
    flex: 1,
    gap: 2,
  },
  insightLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  insightText: {
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.marginMain,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    borderTopWidth: 1,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  moreBtn: {
    width: 56,
    height: 56,
    borderRadius: Rounded.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBtn: {
    flex: 1,
    height: 56,
    borderRadius: Rounded.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: 'rgba(42, 20, 180, 0.25)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaBtnText: {
    fontSize: 17,
    fontWeight: '600',
  },
  mapOptionsPopover: {
    position: 'absolute',
    bottom: 80,
    left: Spacing.marginMain,
    right: Spacing.marginMain,
    borderRadius: Rounded.xl,
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  popoverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  popoverText: {
    fontSize: 16,
    fontWeight: '500',
  },
  popoverDivider: {
    height: 1,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  conflictBox: {
    borderRadius: Rounded.xl,
    padding: 16,
    borderWidth: 1,
    alignSelf: 'stretch',
    gap: 8,
    marginBottom: 24,
  },
  conflictLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  conflictStop: {
    fontSize: 15,
    fontWeight: '500',
  },
  editConstraintsBtn: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: Rounded.xl,
  },
  editConstraintsBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
  },
});
