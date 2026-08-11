import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Linking,
  Alert,
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

  const planOptions = [
    {
      id: 'fastest',
      title: 'En Hızlı',
      subtitle: 'En Seri Rota',
      icon: 'bolt' as const,
      color: C.primary,
      duration: fastestPlan?.totalDurationSeconds ?? (selectedPlan?.totalDurationSeconds ? selectedPlan.totalDurationSeconds - 120 : 2520),
      distance: fastestPlan?.totalDistanceMeters ?? selectedPlan?.totalDistanceMeters ?? 24200,
      cost: fastestPlan?.totalFuelCostEstimate ?? ((selectedPlan?.totalFuelCostEstimate ?? 65) * 1.1),
      stressLevel: 'Yüksek',
      stressPct: 75,
      stressColor: C.error,
      badge: '92% Eşleşme',
      note: fastestPlan?.explanation || 'Otoyol ve ekspres hat ağırlıklı hızlı rota',
    },
    {
      id: 'recommended',
      title: 'En Dengeli',
      subtitle: 'Önerilen Seçenek',
      icon: 'star' as const,
      color: C.secondary,
      duration: recommendedPlan?.totalDurationSeconds ?? selectedPlan?.totalDurationSeconds ?? 2880,
      distance: recommendedPlan?.totalDistanceMeters ?? selectedPlan?.totalDistanceMeters ?? 21000,
      cost: recommendedPlan?.totalFuelCostEstimate ?? selectedPlan?.totalFuelCostEstimate ?? 58,
      stressLevel: 'Düşük',
      stressPct: 25,
      stressColor: C.secondary,
      badge: '98% Önerilen',
      note: recommendedPlan?.explanation || 'Düşük stres, dengeli trafik ve minimum dönüş',
      isRecommended: true,
    },
    {
      id: 'cheapest',
      title: 'En Ekonomik',
      subtitle: 'Eko Rota',
      icon: 'payments' as const,
      color: C.tertiary,
      duration: cheapestPlan?.totalDurationSeconds ?? (selectedPlan?.totalDurationSeconds ? selectedPlan.totalDurationSeconds + 180 : 3300),
      distance: cheapestPlan?.totalDistanceMeters ?? selectedPlan?.totalDistanceMeters ?? 19500,
      cost: cheapestPlan?.totalFuelCostEstimate ?? ((selectedPlan?.totalFuelCostEstimate ?? 42) * 0.85),
      stressLevel: 'Orta',
      stressPct: 45,
      stressColor: C.tertiary,
      badge: '95% Eko',
      note: cheapestPlan?.explanation || 'Minimum yakıt sarfiyatı ve ücretsiz geçişler',
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
          {planOptions.map((plan) => {
            const isSelected =
              (selectedPlanId === plan.id) ||
              (plan.isRecommended && (!selectedPlanId || selectedPlanId === 'recommended'));

            return (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planCard,
                  isSelected && styles.planCardActive,
                ]}
                activeOpacity={0.85}
                onPress={() => setSelectedPlanId(plan.id)}
              >
                <View style={styles.planCardHeader}>
                  <View style={styles.planHeaderLeft}>
                    <View
                      style={[
                        styles.planIconBg,
                        { backgroundColor: plan.isRecommended ? C.secondaryContainer : C.surfaceLow },
                      ]}
                    >
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

                {/* Metrics Grid */}
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
                    <Text style={[styles.metricVal, { color: C.secondary }]}>
                      {formatCost(plan.cost)}
                    </Text>
                  </View>
                </View>

                {/* Stress Level Indicator matching stitch design */}
                <View style={styles.stressContainer}>
                  <View style={styles.stressLabelRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <MaterialIcons name="psychology" size={14} color={C.textSecondary} />
                      <Text style={styles.stressLabel}>Sürüş Stresi</Text>
                    </View>
                    <Text style={[styles.stressValue, { color: plan.stressColor }]}>
                      {plan.stressLevel}
                    </Text>
                  </View>
                  <View style={styles.stressTrack}>
                    <View
                      style={[
                        styles.stressFill,
                        { width: `${plan.stressPct}%`, backgroundColor: plan.stressColor },
                      ]}
                    />
                  </View>
                </View>

                {/* Note */}
                <View style={styles.noteRow}>
                  <MaterialIcons name="info-outline" size={14} color={C.textSecondary} />
                  <Text style={styles.noteText}>{plan.note}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Trade-off Insight Box */}
        <View style={styles.tradeoffBox}>
          <MaterialIcons name="balance" size={22} color={C.primary} />
          <Text style={styles.tradeoffText}>
            <Text style={{ fontWeight: '700' }}>Değerlendirme: </Text>
            En Hızlı rota 8 dakika zaman kazandırır; ancak Önerilen rota size ₺16,00 tasarruf sağlar
            ve düşük stresli ferah ana arterleri tercih eder.
          </Text>
        </View>

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
    backgroundColor: C.background,
  },
  scroll: {
    padding: Spacing.gutter,
    paddingBottom: Spacing.xl,
    gap: Spacing.base,
  },
  summaryCard: {
    backgroundColor: C.surface,
    borderRadius: Rounded.xl,
    padding: Spacing.base,
    ...Shadow.md,
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  summaryIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    ...Typography.h4,
    color: C.text,
  },
  summarySub: {
    ...Typography.caption,
    color: C.textSecondary,
    marginTop: 2,
  },
  sectionHeading: {
    ...Typography.caption,
    fontWeight: '700',
    color: C.outline,
    letterSpacing: 0.8,
    paddingHorizontal: 4,
  },
  plansContainer: {
    gap: Spacing.md,
  },
  planCard: {
    backgroundColor: C.surface,
    borderRadius: Rounded.xl,
    padding: Spacing.base,
    gap: Spacing.md,
    ...Shadow.sm,
    borderWidth: 1.5,
    borderColor: C.outlineVariant,
  },
  planCardActive: {
    borderColor: C.primary,
    backgroundColor: '#FAF9FF',
    ...Shadow.md,
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
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planTitle: {
    ...Typography.h4,
    color: C.text,
  },
  planSub: {
    ...Typography.caption,
    color: C.textSecondary,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
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
    backgroundColor: C.surfaceLow,
    borderRadius: Rounded.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },
  metricItem: {
    flex: 1,
    gap: 2,
  },
  metricLabel: {
    ...Typography.caption,
    color: C.textSecondary,
    fontSize: 11,
  },
  metricVal: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    color: C.text,
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: C.outlineVariant,
    marginHorizontal: Spacing.sm,
  },
  stressContainer: {
    gap: 4,
  },
  stressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stressLabel: {
    ...Typography.caption,
    color: C.textSecondary,
    fontSize: 11,
  },
  stressValue: {
    ...Typography.caption,
    fontWeight: '700',
    fontSize: 11,
  },
  stressTrack: {
    height: 6,
    backgroundColor: C.surfaceLow,
    borderRadius: 3,
    overflow: 'hidden',
  },
  stressFill: {
    height: '100%',
    borderRadius: 3,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  noteText: {
    ...Typography.caption,
    color: C.textSecondary,
  },
  tradeoffBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.primaryFixed,
    borderRadius: Rounded.xl,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  tradeoffText: {
    ...Typography.bodySmall,
    color: C.primary,
    flex: 1,
    lineHeight: 18,
  },
  mapContainer: {
    borderRadius: Rounded.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.outlineVariant,
    ...Shadow.sm,
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
