import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Rounded, Shadow, Typography, TabBarHeight } from '@/constants/theme';
import { ScreenHeader } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';

const C = Colors.light;

type PreferenceMode = 'fastest' | 'cheapest' | 'least_stress' | 'comfortable' | 'eco';

interface PreferenceOption {
  id: PreferenceMode;
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  tag: string;
}

const PREFERENCE_OPTIONS: PreferenceOption[] = [
  {
    id: 'fastest',
    title: 'En Hızlı',
    subtitle: 'Trafik ve gecikmeleri minimuma indiren en seri güzergah.',
    icon: 'bolt',
    tag: 'Süre Odaklı',
  },
  {
    id: 'cheapest',
    title: 'En Ucuz (Eko)',
    subtitle: 'Ücretsiz yollar ve maksimum yakıt tasarrufu sağlayan rota.',
    icon: 'payments',
    tag: 'Tasarruf',
  },
  {
    id: 'least_stress',
    title: 'En Az Stresli',
    subtitle: 'Geniş caddeler, az sayıda dönüş ve sakin sürüş rotaları.',
    icon: 'self-improvement',
    tag: 'Sakin Sürüş',
  },
  {
    id: 'comfortable',
    title: 'En Konforlu',
    subtitle: 'Düzgün zeminli, sarsıntısız ve ferah ana arter güzergahlar.',
    icon: 'airline-seat-recline-extra',
    tag: 'Konfor',
  },
  {
    id: 'eco',
    title: 'Doğa Dostu',
    subtitle: 'Düşük karbon salınımı ve elektrikli araç enerji verimliliği.',
    icon: 'eco',
    tag: 'Yeşil Mobilite',
  },
];

export default function PreferencesScreen() {
  const router = useRouter();

  const [selectedPref, setSelectedPref] = useState<PreferenceMode>('fastest');
  const [avoidTolls, setAvoidTolls] = useState(false);
  const [avoidHighways, setAvoidHighways] = useState(false);
  const [avoidFerries, setAvoidFerries] = useState(false);

  const handleReset = () => {
    setSelectedPref('fastest');
    setAvoidTolls(false);
    setAvoidHighways(false);
    setAvoidFerries(false);
  };

  const handleApply = () => {
    // Return back with applied preferences
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScreenHeader
        title="Yolculuk Tercihleri"
        rightComponent={
          <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
            <Text style={styles.resetBtnText}>Sıfırla</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <View style={styles.introBox}>
          <Text style={styles.introTitle}>Rota Optimizasyon Stratejisi</Text>
          <Text style={styles.introSub}>
            Akıllı motorumuz seyahatlerinizi belirlediğiniz sürüş stiline göre şekillendirir.
          </Text>
        </View>

        {/* Preference Options List */}
        <View style={styles.optionsList}>
          {PREFERENCE_OPTIONS.map((opt) => {
            const isSelected = selectedPref === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.optionCard,
                  isSelected && styles.optionCardActive,
                ]}
                activeOpacity={0.85}
                onPress={() => setSelectedPref(opt.id)}
              >
                <View style={styles.optionHeader}>
                  <View
                    style={[
                      styles.iconBg,
                      isSelected && { backgroundColor: C.primaryFixed },
                    ]}
                  >
                    <MaterialIcons
                      name={opt.icon}
                      size={22}
                      color={isSelected ? C.primary : C.textSecondary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.optionTitle, isSelected && { color: C.primary }]}>
                        {opt.title}
                      </Text>
                      <View style={styles.tagBadge}>
                        <Text style={styles.tagText}>{opt.tag}</Text>
                      </View>
                    </View>
                    <Text style={styles.optionSub}>{opt.subtitle}</Text>
                  </View>
                  <View style={[styles.radioOuter, isSelected && styles.radioOuterActive]}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Avoidances Section */}
        <Text style={styles.sectionHeading}>KAÇINILACAKLAR</Text>
        <View style={styles.avoidCard}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>Ücretli Yollardan Kaçın</Text>
              <Text style={styles.toggleSub}>Paralı geçiş ve otoyolları kullanma</Text>
            </View>
            <Switch
              value={avoidTolls}
              onValueChange={setAvoidTolls}
              trackColor={{ false: C.surfaceContainerHigh, true: C.primary }}
              thumbColor={Platform.OS === 'ios' ? undefined : '#FFFFFF'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>Otoyollardan Kaçın</Text>
              <Text style={styles.toggleSub}>Sadece şehir içi ana arterleri tercih et</Text>
            </View>
            <Switch
              value={avoidHighways}
              onValueChange={setAvoidHighways}
              trackColor={{ false: C.surfaceContainerHigh, true: C.primary }}
              thumbColor={Platform.OS === 'ios' ? undefined : '#FFFFFF'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>Feribot ve Arabalı Vapurlar</Text>
              <Text style={styles.toggleSub}>Deniz geçişlerini devre dışı bırak</Text>
            </View>
            <Switch
              value={avoidFerries}
              onValueChange={setAvoidFerries}
              trackColor={{ false: C.surfaceContainerHigh, true: C.primary }}
              thumbColor={Platform.OS === 'ios' ? undefined : '#FFFFFF'}
            />
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Apply Button */}
      <View style={styles.footer}>
        <Button
          label="Tercihleri Uygula"
          variant="primary"
          size="lg"
          fullWidth
          onPress={handleApply}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF8FF',
  },
  resetBtn: {
    paddingHorizontal: Spacing.sm,
  },
  resetBtnText: {
    ...Typography.bodySmall,
    color: C.primary,
    fontWeight: '600',
  },
  scroll: {
    padding: Spacing.gutter,
    paddingBottom: Spacing.xl + 60,
    gap: Spacing.base,
  },
  introBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: Rounded['2xl'],
    padding: Spacing.base,
    ...Shadow.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  introTitle: {
    ...Typography.h4,
    color: C.onSurface,
  },
  introSub: {
    ...Typography.bodySmall,
    color: C.onSurfaceVariant,
    marginTop: 2,
    lineHeight: 18,
  },
  optionsList: {
    gap: Spacing.sm,
  },
  optionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: Rounded['2xl'],
    padding: Spacing.base,
    ...Shadow.sm,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  optionCardActive: {
    borderColor: C.primary,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    ...Shadow.md,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(238, 240, 247, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitle: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    color: C.onSurface,
  },
  tagBadge: {
    backgroundColor: 'rgba(59, 53, 208, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Rounded.full,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
    color: C.primary,
  },
  optionSub: {
    ...Typography.caption,
    color: C.onSurfaceVariant,
    marginTop: 2,
    lineHeight: 16,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: C.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: C.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: C.primary,
  },
  sectionHeading: {
    ...Typography.labelCaps,
    color: C.outline,
    paddingHorizontal: 8,
    marginTop: Spacing.md,
  },
  avoidCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: Rounded['2xl'],
    padding: Spacing.base,
    ...Shadow.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  toggleLabel: {
    ...Typography.bodyMedium,
    fontWeight: '600',
    color: C.onSurface,
  },
  toggleSub: {
    ...Typography.caption,
    color: C.onSurfaceVariant,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: C.outlineVariant,
    marginVertical: Spacing.sm,
    opacity: 0.5,
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
