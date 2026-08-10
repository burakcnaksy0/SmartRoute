import React, { useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useJourneyStore } from '@/store/journeyStore';
import { useAuthStore } from '@/store/authStore';
import { Colors, Spacing, Rounded, Shadow, Typography, TabBarHeight } from '@/constants/theme';
import { ActionCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const C = Colors.light;

const STAGGER_DELAY = 60;

export default function JourneyIndexScreen() {
  const router         = useRouter();
  const { user }       = useAuthStore();
  const { currentJourney } = useJourneyStore();

  // Stagger entrance animation
  const anim0 = useRef(new Animated.Value(0)).current;
  const anim1 = useRef(new Animated.Value(0)).current;
  const anim2 = useRef(new Animated.Value(0)).current;
  const anim3 = useRef(new Animated.Value(0)).current;
  const anims = [anim0, anim1, anim2, anim3];

  const slide0 = useRef(new Animated.Value(20)).current;
  const slide1 = useRef(new Animated.Value(20)).current;
  const slide2 = useRef(new Animated.Value(20)).current;
  const slide3 = useRef(new Animated.Value(20)).current;
  const slides = [slide0, slide1, slide2, slide3];

  useEffect(() => {
    anims.forEach((anim, i) => {
      Animated.parallel([
        Animated.timing(anim, {
          toValue: 1,
          duration: 400,
          delay: i * STAGGER_DELAY,
          useNativeDriver: true,
        }),
        Animated.timing(slides[i], {
          toValue: 0,
          duration: 350,
          delay: i * STAGGER_DELAY,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, []);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Günaydın';
    if (h < 17) return 'Tünaydın';
    return 'İyi akşamlar';
  })();

  const firstName = user?.fullName?.split(' ')[0] ?? 'Ziyaretçi';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting header */}
        <Animated.View
          style={[
            styles.greetingRow,
            { opacity: anims[0], transform: [{ translateY: slides[0] }] },
          ]}
        >
          <View style={styles.greetingText}>
            <Text style={styles.greeting}>{greeting}, {firstName} 👋</Text>
            <Text style={styles.greetingSub}>Bugün nereye gitmek istersiniz?</Text>
          </View>
          <View style={styles.avatarBadge}>
            <Text style={styles.avatarText}>
              {user?.fullName
                ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                : '?'}
            </Text>
          </View>
        </Animated.View>

        {/* Active journey shortcut */}
        {currentJourney?.status === 'active' && (
          <Animated.View
            style={{ opacity: anims[0], transform: [{ translateY: slides[0] }] }}
          >
            <View style={styles.activeJourneyBanner}>
              <View style={styles.activeJourneyLeft}>
                <View style={styles.activeDot} />
                <Text style={styles.activeJourneyLabel}>Devam eden yolculuk var</Text>
              </View>
              <Button
                label="Görüntüle"
                variant="primary"
                size="sm"
                onPress={() => router.push('/(tabs)/journey/active-journey' as any)}
              />
            </View>
          </Animated.View>
        )}

        {/* Primary CTA: AI Journey Builder */}
        <Animated.View
          style={{
            opacity: anims[1],
            transform: [{ translateY: slides[1] }],
            marginTop: Spacing.sm,
          }}
        >
          <ActionCard
            title="Günümü Anlat"
            description="Günlük planınızı doğal dilde anlatın; yapay zeka konumları ve süreleri çıkararak en uygun rotayı çizsin."
            icon="auto-awesome"
            primary
            onPress={() => router.push('/(tabs)/journey/nlp-input' as any)}
          />
        </Animated.View>

        {/* Secondary options */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>VEYA MANUEL OLUŞTURUN</Text>
        </View>

        <Animated.View
          style={{
            opacity: anims[2],
            transform: [{ translateY: slides[2] }],
          }}
        >
          <ActionCard
            title="Manuel Planlayıcı"
            description="Durakları tek tek ekleyin, öncelikleri ve zaman aralıklarını belirleyerek tam kontrol sahibi olun."
            icon="add-location-alt"
            onPress={() => router.push('/(tabs)/journey/new-stop' as any)}
          />
        </Animated.View>

        {/* Departure suggestion (context-aware) */}
        {currentJourney?.status === 'planned' && (
          <Animated.View
            style={{
              opacity: anims[3],
              transform: [{ translateY: slides[3] }],
              marginTop: Spacing.sm,
            }}
          >
            <ActionCard
              title="Akıllı Çıkış Önerisi"
              description="Trafik tahmin modellerini kullanarak yola çıkmak için en uygun zamanı bulun."
              icon="schedule"
              iconBg={C.tertiaryContainer}
              iconColor={C.tertiary}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/journey/departure-suggestions' as any,
                  params: { journeyId: currentJourney.id },
                })
              }
            />
          </Animated.View>
        )}

        {/* Quick link to plan result */}
        <Animated.View
          style={{
            opacity: anims[3],
            transform: [{ translateY: slides[3] }],
            marginTop: Spacing.sm,
          }}
        >
          <View style={styles.quickLink}>
            <MaterialIcons name="map" size={18} color={C.textSecondary} />
            <Text
              style={styles.quickLinkText}
              onPress={() => router.push('/(tabs)/journey/plan-result' as any)}
            >
              Mevcut alternatif rotaları görüntüle →
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.background,
  },
  scroll: {
    paddingHorizontal: Spacing.gutter,
    paddingTop: Spacing.xl,
    paddingBottom: TabBarHeight + Spacing['2xl'],
    gap: Spacing.md,
  },
  // Greeting
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  greetingText: {
    flex: 1,
    gap: 4,
  },
  greeting: {
    ...Typography.h2,
    color: C.text,
  },
  greetingSub: {
    ...Typography.bodyMedium,
    color: C.textSecondary,
  },
  avatarBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  avatarText: {
    color: C.onPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  // Active banner
  activeJourneyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.primaryFixed,
    borderRadius: Rounded.xl,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: C.primary,
  },
  activeJourneyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.primary,
  },
  activeJourneyLabel: {
    ...Typography.bodyMedium,
    color: C.primary,
    fontWeight: '600',
  },
  // Section header
  sectionHeader: {
    marginTop: Spacing.sm,
    marginBottom: -Spacing.xs,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: C.outline,
  },
  // Quick link
  quickLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
  },
  quickLinkText: {
    ...Typography.bodySmall,
    color: C.textSecondary,
    fontWeight: '500',
  },
});
