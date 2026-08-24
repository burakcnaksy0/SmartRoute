import React, { useRef, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Animated,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
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

import Swipeable from 'react-native-gesture-handler/Swipeable';

function JourneyCard({
  journey,
  onDelete,
  isDeleting,
}: {
  journey: Journey;
  onDelete: (id: string, name?: string) => void;
  isDeleting: boolean;
}) {
  const { label, color } = statusLabel(journey.status);
  const selectedPlan = journey.plans?.find(p => p.isSelected) ?? journey.plans?.[0];
  const distMeters = selectedPlan?.totalDistanceMeters;

  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => onDelete(journey.id, journey.startAddressText)}
        disabled={isDeleting}
      >
        {isDeleting ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <Animated.View style={{ transform: [{ scale }] }}>
            <MaterialIcons name="delete" size={28} color="#FFF" />
          </Animated.View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable renderRightActions={renderRightActions} containerStyle={styles.swipeableContainer}>
      <View style={[styles.card, styles.glassCard]}>
        <View style={styles.cardTop}>
          <View style={styles.cardLeft}>
            <View style={[styles.statusDot, { backgroundColor: color }]} />
            <Text style={styles.cardStatus}>{label}</Text>
            <Text style={styles.dotSeparator}>•</Text>
            <Text style={styles.cardDate}>{formatDate(journey.createdAt)}</Text>
          </View>
          <MaterialIcons name="swipe-left" size={16} color={C.outlineVariant} />
        </View>

        <Text style={styles.cardTitle} numberOfLines={1}>
          {journey.startAddressText ?? `${journey.startLat?.toFixed(4)}, ${journey.startLng?.toFixed(4)}`}
        </Text>

        <View style={styles.cardMeta}>
          <View style={styles.metaChip}>
            <MaterialIcons name="place" size={14} color={C.outline} />
            <Text style={styles.metaText}>{journey.stops?.length ?? 0} durak</Text>
          </View>
          {distMeters != null && (
            <View style={styles.metaChip}>
              <MaterialIcons name="straighten" size={14} color={C.outline} />
              <Text style={styles.metaText}>{formatDist(distMeters)}</Text>
            </View>
          )}
        </View>
      </View>
    </Swipeable>
  );
}

export default function HistoryScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const {
    historyJourneys,
    statistics,
    isHistoryLoading,
    fetchHistoryJourneys,
    fetchStatistics,
    deleteJourney,
  } = useJourneyStore();

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    fetchHistoryJourneys();
    fetchStatistics();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchHistoryJourneys(), fetchStatistics()]);
    setRefreshing(false);
  };

  const handleDeleteJourney = (id: string, name?: string) => {
    Alert.alert(
      'Yolculuğu Sil',
      name
        ? `"${name}" konumlu geçmiş yolculuğu silmek istediğinize emin misiniz?`
        : 'Bu geçmiş yolculuk kaydını silmek istediğinize emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(id);
            const success = await deleteJourney(id);
            setDeletingId(null);
            if (!success) {
              Alert.alert('Hata', 'Yolculuk kaydı silinemedi. Lütfen tekrar deneyin.');
            }
          },
        },
      ]
    );
  };

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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={C.primary}
              colors={[C.primary]}
            />
          }
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
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>Geçmiş Yolculuklar</Text>
            {historyJourneys.length > 0 && (
              <Text style={styles.countBadge}>{historyJourneys.length} Kayıt</Text>
            )}
          </View>

          {/* Loading */}
          {isHistoryLoading && !refreshing && (
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

          {historyJourneys.map((journey) => (
            <JourneyCard
              key={journey.id}
              journey={journey}
              onDelete={handleDeleteJourney}
              isDeleting={deletingId === journey.id}
            />
          ))}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF8FF',
  },
  header: {
    paddingHorizontal: Spacing.gutter,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.base,
    gap: 4,
  },
  headerTitle: {
    ...Typography.h1,
    color: C.onSurface,
  },
  headerSub: {
    ...Typography.bodyMedium,
    color: C.onSurfaceVariant,
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
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: Rounded['2xl'],
    padding: Spacing.base,
    alignItems: 'center',
    gap: Spacing.xs,
    ...Shadow.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  statValue: {
    ...Typography.h2,
    color: C.primary,
  },
  statLabel: {
    ...Typography.caption,
    color: C.onSurfaceVariant,
    textAlign: 'center',
  },
  // Section label
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: -Spacing.md,
  },
  sectionLabel: {
    ...Typography.labelCaps,
    color: C.outline,
  },
  countBadge: {
    ...Typography.caption,
    fontWeight: '600',
    color: C.primary,
    backgroundColor: 'rgba(59, 53, 208, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Rounded.full,
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
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: Rounded['2xl'],
    padding: Spacing.lg,
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    ...Shadow.lg,
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
    color: C.onSurfaceVariant,
  },
  dotSeparator: {
    ...Typography.caption,
    color: C.outlineVariant,
  },
  cardDate: {
    ...Typography.caption,
    color: C.outline,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE8E8',
  },
  cardTitle: {
    ...Typography.h4,
    color: C.onSurface,
    marginTop: 4,
  },
  cardMeta: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: 4,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...Typography.caption,
    color: C.onSurfaceVariant,
  },
  // Swipe and Glass styles
  swipeableContainer: {
    marginBottom: Spacing.sm,
    borderRadius: Rounded['2xl'],
    overflow: 'hidden',
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  deleteAction: {
    backgroundColor: C.error,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  },
});
