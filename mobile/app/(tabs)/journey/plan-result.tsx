import React, { useEffect, useState, useRef } from 'react';
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
import { decodePolyline } from '@/utils/polyline';
import { useJourneyStore } from '@/store/journeyStore';
import { useVehicleStore } from '@/store/vehicleStore';
import StopList, { StopListItem } from '@/components/StopList';
import { Colors, Spacing, Rounded, Shadow, Typography, TabBarHeight } from '@/constants/theme';
import { ScreenHeader } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import MapLocationView from '@/components/MapLocationView';

const C = Colors.light;

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

function AnimatedPlanCard({ plan, isSelected, onSelect, index }: any) {
  const animVal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animVal, {
      toValue: 1,
      duration: 500,
      delay: index * 150, // Staggered delay based on index
      useNativeDriver: true,
    }).start();
  }, []);

  const translateY = animVal.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0], // Slide up
  });

  return (
    <Animated.View style={{ opacity: animVal, transform: [{ translateY }] }}>
      <TouchableOpacity
        style={[styles.planCard, isSelected && styles.planCardActive]}
        activeOpacity={0.85}
        onPress={() => onSelect(plan.id)}
      >
        <View style={styles.planCardHeader}>
          <View style={styles.planHeaderLeft}>
            <View style={[styles.planIconBg, { backgroundColor: plan.isRecommended ? C.secondaryContainer : C.surfaceLow }]}>
              <MaterialIcons name={plan.icon} size={20} color={plan.color} />
            </View>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.planTitle}>{plan.title}</Text>
                {plan.isRecommended && (
                  <Badge label="ÖNERİLEN" variant="secondary" size="sm" />
                )}
              </View>
              <Text style={styles.planSub}>{plan.subtitle}</Text>
            </View>
          </View>
          <View style={styles.radioOuter}>
            {isSelected && <View style={styles.radioInner} />}
          </View>
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Süre</Text>
            <Text style={styles.metricVal}>{formatDuration(plan.duration)}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Mesafe</Text>
            <Text style={styles.metricVal}>{formatDistance(plan.distance)}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Tahmini Masraf</Text>
            <Text style={[styles.metricVal, { color: C.secondary }]}>{formatCost(plan.cost)}</Text>
          </View>
        </View>

        <View style={styles.stressContainer}>
          <View style={styles.stressLabelRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MaterialIcons name="psychology" size={14} color={C.textSecondary} />
              <Text style={styles.stressLabel}>Sürüş Stresi</Text>
            </View>
            <Text style={[styles.stressValue, { color: plan.stressColor }]}>{plan.stressLevel}</Text>
          </View>
          <View style={styles.stressTrack}>
            <View style={[styles.stressFill, { width: `${plan.stressPct}%`, backgroundColor: plan.stressColor }]} />
          </View>
        </View>

        <View style={styles.noteRow}>
          <MaterialIcons name="info-outline" size={14} color={C.textSecondary} />
          <Text style={styles.noteText} numberOfLines={2}>
            {(plan.note || '').split('\n')[0]}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function PlanResultScreen() {
  const router = useRouter();
  const { currentJourney, startJourney, reorderStops } = useJourneyStore();
  const { defaultVehicle } = useVehicleStore();

  const [selectedPlanId, setSelectedPlanId] = useState<string>('recommended');
  const [stopOrder, setStopOrder] = useState<StopListItem[]>([]);

  // Initialize selected plan and stop order
  useEffect(() => {
    if (currentJourney) {
      const rec = currentJourney.plans?.find(
        (p) => (p.planLabel === 'recommended' || p.label === 'recommended')
      );
      if (rec) {
        setSelectedPlanId(rec.planLabel || rec.label || 'recommended');
      } else if (currentJourney.plans && currentJourney.plans.length > 0) {
        const first = currentJourney.plans[0];
        setSelectedPlanId(first.planLabel || first.label || 'recommended');
      }

      const sorted = [...(currentJourney.stops ?? [])].sort(
        (a, b) => (a.optimizedOrder ?? a.sequenceOrder) - (b.optimizedOrder ?? b.sequenceOrder)
      );

      setStopOrder(
        sorted.map((s) => ({
          id: s.id,
          placeName: s.placeName,
          visitDurationMinutes: s.visitDurationMinutes,
          priority: s.priority as StopListItem['priority'],
          stopType: s.stopType,
          timeWindowStart: s.timeWindowStart,
          timeWindowEnd: s.timeWindowEnd,
          optimizedOrder: s.optimizedOrder,
        }))
      );
    }
  }, [currentJourney]);

  const fastestPlan = currentJourney?.plans?.find((p) => p.planLabel === 'fastest' || p.label === 'fastest');
  const recommendedPlan = currentJourney?.plans?.find((p) => p.planLabel === 'recommended' || p.label === 'recommended');
  const cheapestPlan = currentJourney?.plans?.find((p) => p.planLabel === 'cheapest' || p.label === 'cheapest');

  const selectedPlan =
    (selectedPlanId === 'fastest' ? fastestPlan : null) ||
    (selectedPlanId === 'cheapest' ? cheapestPlan : null) ||
    recommendedPlan ||
    currentJourney?.plans?.[0];

  // Decode polylines for map display
  const routePolylinePoints = selectedPlan?.legs?.flatMap((leg) => {
    if (!leg.polylineEncoded) return [];
    return decodePolyline(leg.polylineEncoded);
  }) ?? [];

  const handleStartNavigation = async () => {
    if (!currentJourney) return;
    try {
      await startJourney();
    } catch {}

    // Open external navigation for the first stop automatically
    const firstStop = currentJourney.stops?.[0];
    if (firstStop) {
      const url =
        Platform.OS === 'ios'
          ? `maps://?daddr=${firstStop.lat},${firstStop.lng}`
          : `https://www.google.com/maps/dir/?api=1&destination=${firstStop.lat},${firstStop.lng}`;
      Linking.openURL(url).catch(() => console.log('Harita uygulaması açılamadı.'));
    }

    router.push('/(tabs)/journey/active-journey' as any);
  };

  const handleOpenExternalMaps = () => {
    if (!currentJourney || !currentJourney.stops || currentJourney.stops.length === 0) return;
    const dest = currentJourney.stops[currentJourney.stops.length - 1];
    const url =
      Platform.OS === 'ios'
        ? `maps://?daddr=${dest.lat},${dest.lng}`
        : `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}`;
    Linking.openURL(url).catch(() => Alert.alert('Hata', 'Harita uygulaması açılamadı.'));
  };

  const getStressLevel = (score: number = 0.15) => {
    if (score > 0.6) return { label: 'Yüksek', pct: score * 100, color: C.error };
    if (score > 0.3) return { label: 'Orta', pct: score * 100, color: C.tertiary };
    return { label: 'Düşük', pct: score * 100, color: C.secondary };
  };

  const planOptions = [
    {
      id: 'fastest',
      title: 'En Hızlı',
      subtitle: 'En Seri Rota',
      icon: 'bolt' as const,
      color: C.primary,
      duration: fastestPlan?.totalDurationSeconds ?? selectedPlan?.totalDurationSeconds ?? 0,
      distance: fastestPlan?.totalDistanceMeters ?? selectedPlan?.totalDistanceMeters ?? 0,
      cost: fastestPlan?.totalFuelCostEstimate ?? selectedPlan?.totalFuelCostEstimate ?? 0,
      stressLevel: getStressLevel(fastestPlan?.trafficRiskScore).label,
      stressPct: getStressLevel(fastestPlan?.trafficRiskScore).pct,
      stressColor: getStressLevel(fastestPlan?.trafficRiskScore).color,
      badge: 'Hızlı Rota',
      note: fastestPlan?.explanationText || fastestPlan?.explanation || 'Süre odaklı hızlı rota seçeneği.',
    },
    {
      id: 'recommended',
      title: 'En Dengeli',
      subtitle: 'Önerilen Seçenek',
      icon: 'star' as const,
      color: C.secondary,
      duration: recommendedPlan?.totalDurationSeconds ?? selectedPlan?.totalDurationSeconds ?? 0,
      distance: recommendedPlan?.totalDistanceMeters ?? selectedPlan?.totalDistanceMeters ?? 0,
      cost: recommendedPlan?.totalFuelCostEstimate ?? selectedPlan?.totalFuelCostEstimate ?? 0,
      stressLevel: getStressLevel(recommendedPlan?.trafficRiskScore).label,
      stressPct: getStressLevel(recommendedPlan?.trafficRiskScore).pct,
      stressColor: getStressLevel(recommendedPlan?.trafficRiskScore).color,
      badge: 'Önerilen',
      note: recommendedPlan?.explanationText || recommendedPlan?.explanation || 'Dengeli süre ve maliyet.',
      isRecommended: true,
    },
    {
      id: 'cheapest',
      title: 'En Ekonomik',
      subtitle: 'Eko Rota',
      icon: 'payments' as const,
      color: C.tertiary,
      duration: cheapestPlan?.totalDurationSeconds ?? selectedPlan?.totalDurationSeconds ?? 0,
      distance: cheapestPlan?.totalDistanceMeters ?? selectedPlan?.totalDistanceMeters ?? 0,
      cost: cheapestPlan?.totalFuelCostEstimate ?? selectedPlan?.totalFuelCostEstimate ?? 0,
      stressLevel: getStressLevel(cheapestPlan?.trafficRiskScore).label,
      stressPct: getStressLevel(cheapestPlan?.trafficRiskScore).pct,
      stressColor: getStressLevel(cheapestPlan?.trafficRiskScore).color,
      badge: 'Ekonomik',
      note: cheapestPlan?.explanationText || cheapestPlan?.explanation || 'Minimum yakıt ve maliyet.',
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScreenHeader
        title="Optimizasyon Sonuçları"
        rightComponent={
          <TouchableOpacity onPress={handleOpenExternalMaps} style={{ padding: 4 }}>
            <MaterialIcons name="open-in-new" size={20} color={C.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Journey Summary Header */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryIconBg}>
              <MaterialIcons name="auto-awesome" size={20} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryTitle}>
                {currentJourney?.startAddressText ?? 'Mevcut Konum'} ➔ {stopOrder.length} Durak
              </Text>
              <Text style={styles.summarySub}>
                Tüm zaman pencereleri ve durak öncelikleri optimize edildi
              </Text>
            </View>
          </View>
        </View>

        {/* Multi-Criteria Route Comparison Cards */}
        <Text style={styles.sectionHeading}>ROTA SEÇENEKLERİ</Text>
        <View style={styles.plansContainer}>
          {planOptions.map((plan, idx) => {
            const isSelected =
              (selectedPlanId === plan.id) ||
              (plan.isRecommended && (!selectedPlanId || selectedPlanId === 'recommended'));

            return (
              <AnimatedPlanCard
                key={plan.id}
                plan={plan}
                isSelected={isSelected}
                onSelect={setSelectedPlanId}
                index={idx}
              />
            );
          })}
        </View>

        {/* Dynamic Trade-off Insight */}
        {selectedPlan?.explanationText && (
          <View style={styles.tradeoffBox}>
            <MaterialIcons name="local-gas-station" size={22} color={C.primary} />
            <Text style={styles.tradeoffText}>
              {selectedPlan.explanationText.split('\n').filter((l: string) => l.includes('⛽') || l.includes('💡')).join('\n') || 
               `Seçili rota: ${formatDistance(selectedPlan.totalDistanceMeters)} mesafe, tahmini yakıt maliyeti ${formatCost(selectedPlan.totalFuelCostEstimate)}`
              }
            </Text>
          </View>
        )}
        {!selectedPlan?.explanationText && (
          <View style={styles.tradeoffBox}>
            <MaterialIcons name="balance" size={22} color={C.primary} />
            <Text style={styles.tradeoffText}>
              <Text style={{ fontWeight: '700' }}>Değerlendirme: </Text>
              Rota seçeneklerini karşılaştırarak en uygun güzergahı belirleyin.
            </Text>
          </View>
        )}

        {/* Interactive Map Preview */}
        <Text style={styles.sectionHeading}>ROTA ÖNİZLEMESİ</Text>
        <View style={styles.mapContainer}>
          <MapLocationView
            height={220}
            initialLocation={{
              latitude: currentJourney?.startLat ?? 41.0082,
              longitude: currentJourney?.startLng ?? 28.9784,
            }}
            markers={(currentJourney?.stops ?? []).map((s, idx) => ({
              id: s.id,
              latitude: s.lat,
              longitude: s.lng,
              title: `${idx + 1}. ${s.placeName}`,
              subtitle: `${s.visitDurationMinutes} dk`,
              pinColor: s.priority === 'critical' ? C.error : C.primary,
            }))}
            routePolyline={routePolylinePoints}
          />
        </View>

        {/* Optimized Stops Itinerary */}
        <Text style={styles.sectionHeading}>GÜZERGAH VE DURAKLAR ({stopOrder.length})</Text>
        <StopList
          stops={stopOrder}
          onReorder={(newOrder) => {
            setStopOrder(newOrder);
            reorderStops?.(newOrder.map((s) => s.id!));
          }}
          onEditStop={(idx) =>
            router.push({
              pathname: '/(tabs)/journey/stop-detail' as any,
              params: { stopIndex: String(idx) },
            })
          }
          isManualOverride={false}
        />
      </ScrollView>

      {/* Sticky Bottom Actions */}
      <View style={styles.footer}>
        <Button
          label="Navigasyonu Başlat"
          variant="primary"
          size="lg"
          fullWidth
          icon="navigation"
          onPress={handleStartNavigation}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF8FF', // Soft modern background
  },
  scroll: {
    padding: Spacing.gutter,
    paddingBottom: Spacing.xl + 80,
    gap: Spacing.md,
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: Rounded['2xl'],
    padding: Spacing.lg,
    ...Shadow.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  summaryIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    ...Typography.h3,
    color: C.onSurface,
  },
  summarySub: {
    ...Typography.bodySmall,
    color: C.onSurfaceVariant,
    marginTop: 4,
  },
  sectionHeading: {
    ...Typography.labelCaps,
    color: C.outline,
    paddingHorizontal: 8,
    marginTop: Spacing.md,
  },
  plansContainer: {
    gap: Spacing.md,
  },
  planCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: Rounded['2xl'],
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadow.sm,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  planCardActive: {
    borderColor: C.primary,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    ...Shadow.lg,
  },
  planCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  planIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planTitle: {
    ...Typography.h3,
    color: C.onSurface,
  },
  planSub: {
    ...Typography.caption,
    color: C.onSurfaceVariant,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: C.primary,
  },
  metricsGrid: {
    flexDirection: 'row',
    backgroundColor: 'rgba(238, 240, 247, 0.5)',
    borderRadius: Rounded.xl,
    padding: Spacing.md,
    alignItems: 'center',
  },
  metricItem: {
    flex: 1,
    gap: 4,
  },
  metricLabel: {
    ...Typography.caption,
    color: C.onSurfaceVariant,
  },
  metricVal: {
    ...Typography.h4,
    color: C.onSurface,
  },
  metricDivider: {
    width: 1,
    height: 32,
    backgroundColor: C.outlineVariant,
    marginHorizontal: Spacing.md,
    opacity: 0.5,
  },
  stressContainer: {
    gap: 6,
  },
  stressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stressLabel: {
    ...Typography.caption,
    color: C.onSurfaceVariant,
  },
  stressValue: {
    ...Typography.caption,
    fontWeight: '700',
  },
  stressTrack: {
    height: 8,
    backgroundColor: 'rgba(238, 240, 247, 0.8)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  stressFill: {
    height: '100%',
    borderRadius: 4,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(53, 37, 205, 0.04)',
    padding: Spacing.sm,
    borderRadius: Rounded.lg,
  },
  noteText: {
    ...Typography.bodySmall,
    color: C.onSurfaceVariant,
    flex: 1,
  },
  tradeoffBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 53, 208, 0.08)',
    borderRadius: Rounded['2xl'],
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(59, 53, 208, 0.1)',
  },
  tradeoffText: {
    ...Typography.bodySmall,
    color: C.primary,
    flex: 1,
    lineHeight: 20,
  },
  mapContainer: {
    borderRadius: Rounded['2xl'],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    ...Shadow.md,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.marginMain,
    paddingTop: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 34 : Spacing.xl,
    backgroundColor: 'rgba(250, 248, 255, 0.85)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
  },
});
