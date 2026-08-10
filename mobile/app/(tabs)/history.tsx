import React, { useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Animated,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Rounded, Shadow, Typography, TabBarHeight } from '@/constants/theme';
import { EmptyState } from '@/components/ui/States';
import { useJourneyStore } from '@/store/journeyStore';
import { Journey } from '@/api/journey';

const C = Colors.light;

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDist(meters: number | undefined): string {
  if (!meters) return '—';
  return meters >= 1000
    ? `${(meters / 1000).toFixed(1)} km`
    : `${meters} m`;
}

function statusLabel(status: string): { label: string; color: string } {
  switch (status) {
    case 'completed': return { label: 'Tamamlandı', color: C.secondary };
    case 'active':
    case 'in_progress': return { label: 'Devam Ediyor', color: C.primary };
    case 'planned': return { label: 'Planlandı', color: C.tertiary };
    case 'cancelled': return { label: 'İptal', color: C.error };
    default: return { label: 'Taslak', color: C.outline };
  }
}

function JourneyCard({ journey }: { journey: Journey }) {
  const router = useRouter();
  const { label, color } = statusLabel(journey.status);
  const selectedPlan = journey.plans?.find(p => p.isSelected) ?? journey.plans?.[0];
  const distMeters = selectedPlan?.totalDistanceMeters;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        // Future: open journey detail screen
      }}
      activeOpacity={0.85}
    >
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <View style={[styles.statusDot, { backgroundColor: color }]} />
          <Text style={styles.cardStatus}>{label}</Text>
        </View>
        <Text style={styles.cardDate}>{formatDate(journey.createdAt)}</Text>
      </View>

      <Text style={styles.cardTitle} numberOfLines={1}>
        {journey.startAddressText ?? `${journey.startLat?.toFixed(4)}, ${journey.startLng?.toFixed(4)}`}
      </Text>

      <View style={styles.cardMeta}>
        <View style={styles.metaChip}>
          <MaterialIcons name="place" size={13} color={C.outline} />
          <Text style={styles.metaText}>{journey.stops?.length ?? 0} durak</Text>
        </View>
        {distMeters != null && (
          <View style={styles.metaChip}>
            <MaterialIcons name="straighten" size={13} color={C.outline} />
            <Text style={styles.metaText}>{formatDist(distMeters)}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function HistoryScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const {
    historyJourneys,
    statistics,
    isHistoryLoading,
    fetchHistoryJourneys,
    fetchStatistics,
  } = useJourneyStore();

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    fetchHistoryJourneys();
    fetchStatistics();
  }, []);

  const totalDistKm = statistics?.totalDistanceKm ?? 0;
  const totalSavings = statistics?.totalSavingsEur ?? 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Aktivite</Text>
        <Text style={styles.headerSub}>Geçmiş yolculuklarınız ve istatistikleriniz</Text>
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <MaterialIcons name="route" size={22} color={C.primary} />
              <Text style={styles.statValue}>
                {statistics ? String(statistics.totalTrips) : '—'}
              </Text>
              <Text style={styles.statLabel}>Toplam Yolculuk</Text>
            </View>
            <View style={styles.statCard}>
              <MaterialIcons name="straighten" size={22} color={C.secondary} />
              <Text style={[styles.statValue, { color: C.secondary }]}>
                {totalDistKm > 0 ? `${totalDistKm.toFixed(0)} km` : '—'}
              </Text>
              <Text style={styles.statLabel}>Toplam Mesafe</Text>
            </View>
            <View style={styles.statCard}>
              <MaterialIcons name="savings" size={22} color={C.tertiary} />
              <Text style={[styles.statValue, { color: C.tertiary }]}>
                {totalSavings > 0 ? `₺${totalSavings.toFixed(0)}` : '—'}
              </Text>
              <Text style={styles.statLabel}>Tasarruf</Text>
            </View>
          </View>

          {/* Section label */}
          <Text style={styles.sectionLabel}>Geçmiş Yolculuklar</Text>

          {/* Loading */}
          {isHistoryLoading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={C.primary} />
              <Text style={styles.loadingText}>Yükleniyor...</Text>
            </View>
          )}

          {/* Journey list */}
          {!isHistoryLoading && historyJourneys.length === 0 && (
            <EmptyState
              icon="history"
              title="Henüz yolculuk yok"
              description="Tamamlanan yolculuklarınız burada görünecektir. Başlamak için ilk optimize edilmiş rotanızı planlayın."
              style={styles.emptyState}
            />
          )}

          {historyJourneys.map(journey => (
            <JourneyCard key={journey.id} journey={journey} />
          ))}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.background,
  },
  header: {
    paddingHorizontal: Spacing.gutter,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.base,
    gap: 4,
  },
  headerTitle: {
    ...Typography.h1,
    color: C.text,
  },
  headerSub: {
    ...Typography.bodyMedium,
    color: C.textSecondary,
  },
  content: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: Spacing.gutter,
    paddingBottom: TabBarHeight + Spacing['2xl'],
    gap: Spacing.xl,
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: Rounded.xl,
    padding: Spacing.base,
    alignItems: 'center',
    gap: Spacing.xs,
    ...Shadow.sm,
  },
  statValue: {
    ...Typography.h2,
    color: C.primary,
  },
  statLabel: {
    ...Typography.caption,
    color: C.textSecondary,
    textAlign: 'center',
  },
  // Section label
  sectionLabel: {
    ...Typography.labelCaps,
    color: C.outline,
    paddingHorizontal: 4,
    marginBottom: -Spacing.md,
  },
  // Loading
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
  },
  loadingText: {
    ...Typography.bodyMedium,
    color: C.outline,
  },
  emptyState: {
    marginTop: Spacing.lg,
  },
  // Journey card
  card: {
    backgroundColor: C.surface,
    borderRadius: Rounded.xl,
    padding: Spacing.base,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    ...Shadow.sm,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardStatus: {
    ...Typography.caption,
    fontWeight: '600',
    color: C.textSecondary,
  },
  cardDate: {
    ...Typography.caption,
    color: C.outline,
  },
  cardTitle: {
    ...Typography.bodyMedium,
    fontWeight: '600',
    color: C.text,
  },
  cardMeta: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...Typography.caption,
    color: C.outline,
  },
});
