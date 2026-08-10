import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Rounded } from '@/constants/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface StopListItem {
  id?: string;
  placeName: string;
  visitDurationMinutes: number;
  priority: 'critical' | 'high' | 'normal' | 'low';
  stopType: string;
  timeWindowStart?: string;
  timeWindowEnd?: string;
  optimizedOrder?: number;
  hasTimeWindowRisk?: boolean;
}

interface StopListProps {
  stops: StopListItem[];
  onReorder: (newOrder: StopListItem[]) => void;
  onEditStop?: (index: number) => void;
  onDeleteStop?: (index: number) => void;
  showOptimizedOrderHint?: boolean;
  isManualOverride?: boolean;
  onToggleManualOverride?: () => void;
}

function formatTime(isoOrTime?: string): string {
  if (!isoOrTime) return '';
  const match = isoOrTime.match(/(\d{2}:\d{2})/);
  return match ? match[1] : '';
}

interface StopCardProps {
  stop: StopListItem;
  index: number;
  total: number;
  isManualOverride: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function StopCard({ stop, index, total, isManualOverride, onMoveUp, onMoveDown, onEdit, onDelete }: StopCardProps) {
  const colors = Colors.light;

  // Map priority colors strictly to intelligent mobility design system
  const priorityConfig = {
    critical: { color: colors.error, bg: colors.errorContainer, label: 'Kritik' },
    high:     { color: colors.tertiary, bg: colors.tertiaryContainer + '18', label: 'Yüksek' },
    normal:   { color: colors.secondary, bg: colors.secondaryContainer + '18', label: 'Normal' },
    low:      { color: colors.outline, bg: colors.surfaceLow, label: 'Düşük' },
  };

  const cfg = priorityConfig[stop.priority] || priorityConfig.normal;
  const isCritical = stop.priority === 'critical';
  const hasWindow = !!(stop.timeWindowStart || stop.timeWindowEnd);
  const startTime = formatTime(stop.timeWindowStart);
  const endTime = formatTime(stop.timeWindowEnd);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface },
        isCritical && [styles.cardCritical, { borderColor: colors.errorContainer }],
        stop.hasTimeWindowRisk && [styles.cardRisk, { borderColor: colors.tertiary }],
      ]}
    >
      {/* Left Area: Order badge and drag triggers */}
      <View style={styles.cardLeft}>
        <View style={[styles.orderBadge, { backgroundColor: cfg.bg, borderColor: cfg.color }]}>
          <Text style={[styles.orderBadgeText, { color: cfg.color }]}>{index + 1}</Text>
        </View>
        {isManualOverride && (
          <View style={styles.dragHandles}>
            <TouchableOpacity
              onPress={onMoveUp}
              disabled={index === 0}
              style={[styles.arrowBtn, { backgroundColor: colors.surfaceLow }, index === 0 && styles.arrowBtnDisabled]}
            >
              <MaterialIcons name="keyboard-arrow-up" size={16} color={index === 0 ? colors.outlineVariant : colors.onSurface} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onMoveDown}
              disabled={index === total - 1}
              style={[styles.arrowBtn, { backgroundColor: colors.surfaceLow }, index === total - 1 && styles.arrowBtnDisabled]}
            >
              <MaterialIcons name="keyboard-arrow-down" size={16} color={index === total - 1 ? colors.outlineVariant : colors.onSurface} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Center Content */}
      <View style={styles.cardContent}>
        <View style={styles.cardNameRow}>
          <Text style={[styles.cardName, { color: colors.onSurface }]} numberOfLines={1}>{stop.placeName}</Text>
          <View style={[styles.priorityChip, { backgroundColor: cfg.bg, borderColor: cfg.color }]}>
            <Text style={[styles.priorityChipText, { color: cfg.color }]}>
              {cfg.label}
            </Text>
          </View>
        </View>

        <View style={styles.cardMeta}>
          <View style={styles.metaBadge}>
            <MaterialIcons name="schedule" size={14} color={colors.outline} />
            <Text style={[styles.cardMetaText, { color: colors.outline }]}>{stop.visitDurationMinutes} dk</Text>
          </View>
          {hasWindow && (
            <View style={styles.metaBadge}>
              <MaterialIcons name="hourglass-empty" size={14} color={colors.primary} />
              <Text style={[styles.cardMetaText, { color: colors.primary }]}>
                {startTime && endTime ? `${startTime} – ${endTime}` : startTime || endTime}
              </Text>
            </View>
          )}
        </View>

        {/* Warning Banners */}
        {stop.hasTimeWindowRisk && (
          <View style={[styles.riskBanner, { backgroundColor: colors.tertiaryContainer + '10', borderColor: colors.tertiary }]}>
            <MaterialIcons name="warning" size={14} color={colors.tertiary} />
            <Text style={[styles.riskBannerText, { color: colors.tertiary }]}>
              Yetişememe riski var (Dar zaman penceresi)
            </Text>
          </View>
        )}

        {isCritical && hasWindow && (
          <View style={[styles.criticalBanner, { backgroundColor: colors.errorContainer + '10' }]}>
            <MaterialIcons name="error" size={14} color={colors.error} />
            <Text style={[styles.criticalBannerText, { color: colors.error }]}>
              Kritik Durak — Zaman optimizasyonu kilitlidir
            </Text>
          </View>
        )}
      </View>

      {/* Right Area: Actions */}
      <View style={styles.cardActions}>
        <TouchableOpacity onPress={onEdit} style={styles.actionBtn}>
          <MaterialIcons name="edit" size={20} color={colors.onSurfaceVariant} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={styles.actionBtn}>
          <MaterialIcons name="delete-outline" size={20} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function StopList({
  stops,
  onReorder,
  onEditStop,
  onDeleteStop,
  showOptimizedOrderHint = false,
  isManualOverride = false,
  onToggleManualOverride,
}: StopListProps) {
  const colors = Colors.light;

  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const next = [...stops];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onReorder(next);
  }, [stops, onReorder]);

  const handleMoveDown = useCallback((index: number) => {
    if (index === stops.length - 1) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const next = [...stops];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onReorder(next);
  }, [stops, onReorder]);

  const handleDelete = useCallback((index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onDeleteStop?.(index);
  }, [onDeleteStop]);

  if (stops.length === 0) {
    return (
      <View style={styles.empty}>
        <View style={[styles.emptyIconBg, { backgroundColor: colors.surfaceContainer }]}>
          <MaterialIcons name="location-on" size={32} color={colors.primary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>Henüz durak eklenmedi</Text>
        <Text style={[styles.emptyHint, { color: colors.outline }]}>Rotanızı planlamak için durak ekleyin.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Manual override toggle bar */}
      {onToggleManualOverride && (
        <TouchableOpacity
          style={[
            styles.overrideBar,
            { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
            isManualOverride && [styles.overrideBarActive, { borderColor: colors.primary, backgroundColor: colors.surfaceLow }],
          ]}
          onPress={onToggleManualOverride}
          activeOpacity={0.7}
        >
          <MaterialIcons 
            name={isManualOverride ? 'lock-open' : 'lock'} 
            size={22} 
            color={isManualOverride ? colors.primary : colors.outline} 
          />
          <View style={styles.overrideBarText}>
            <Text style={[
              styles.overrideBarTitle, 
              { color: colors.onSurface },
              isManualOverride && { color: colors.primary, fontWeight: '600' }
            ]}>
              {isManualOverride ? 'Manuel Sıralama Aktif' : 'Sıralamayı Değiştir'}
            </Text>
            <Text style={[styles.overrideBarSub, { color: colors.outline }]}>
              {isManualOverride
                ? 'Ok butonları ile durakları sürükleyin'
                : 'Sistemin optimize ettiği sırayı düzenle'}
            </Text>
          </View>
          <MaterialIcons 
            name={isManualOverride ? 'check' : 'chevron-right'} 
            size={22} 
            color={isManualOverride ? colors.primary : colors.outline} 
          />
        </TouchableOpacity>
      )}

      {/* Stop cards */}
      {stops.map((stop, index) => (
        <StopCard
          key={stop.id ?? `${index}-${stop.placeName}`}
          stop={stop}
          index={index}
          total={stops.length}
          isManualOverride={isManualOverride}
          onMoveUp={() => handleMoveUp(index)}
          onMoveDown={() => handleMoveDown(index)}
          onEdit={() => onEditStop?.(index)}
          onDelete={() => handleDelete(index)}
        />
      ))}

      {/* System order hint */}
      {showOptimizedOrderHint && isManualOverride && (
        <View style={[styles.systemHint, { backgroundColor: colors.surfaceLow, borderColor: colors.outlineVariant }]}>
          <MaterialIcons name="info-outline" size={16} color={colors.primary} />
          <Text style={[styles.systemHintText, { color: colors.primary }]}>
            Sistem sırasını manuel değiştirdiniz. Optimizasyon butonuna basarak önerilen rotayı geri alabilirsiniz.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 12,
  },
  overrideBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Rounded.xl,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    shadowColor: 'rgba(0, 0, 0, 0.02)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 1,
    marginBottom: 4,
  },
  overrideBarActive: {
    borderWidth: 1.5,
  },
  overrideBarText: {
    flex: 1,
  },
  overrideBarTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  overrideBarSub: {
    fontSize: 12,
    marginTop: 2,
  },
  card: {
    flexDirection: 'row',
    borderRadius: Rounded.xl,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    alignItems: 'flex-start',
    shadowColor: 'rgba(0, 0, 0, 0.02)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 1,
  },
  cardCritical: {
    borderWidth: 1.5,
  },
  cardRisk: {
    borderWidth: 1.5,
  },
  cardLeft: {
    alignItems: 'center',
    gap: 8,
    minWidth: 32,
  },
  orderBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  orderBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  dragHandles: {
    gap: 4,
  },
  arrowBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Rounded.sm,
  },
  arrowBtnDisabled: {
    opacity: 0.4,
  },
  cardContent: {
    flex: 1,
    gap: 6,
  },
  cardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
    flex: 1,
  },
  priorityChip: {
    borderRadius: Rounded.full,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderWidth: 1,
  },
  priorityChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardMetaText: {
    fontSize: 13,
    fontWeight: '500',
  },
  riskBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Rounded.md,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    marginTop: 2,
  },
  riskBannerText: {
    fontSize: 12,
    fontWeight: '500',
  },
  criticalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Rounded.md,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 2,
  },
  criticalBannerText: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 4,
    alignSelf: 'center',
  },
  actionBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptyHint: {
    fontSize: 14,
    textAlign: 'center',
  },
  systemHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: Rounded.xl,
    padding: 12,
    borderWidth: 1,
  },
  systemHintText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
});
