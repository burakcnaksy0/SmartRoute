import React, { useRef, useEffect } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
  Animated,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useJourneyStore } from '@/store/journeyStore';
import { Colors, Spacing, Rounded } from '@/constants/theme';

export default function JourneyIndexScreen() {
  const router = useRouter();
  const colors = Colors.light;
  const { currentJourney } = useJourneyStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" />
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: 'rgba(0,0,0,0.04)' }]}>
        <View style={styles.headerTitleRow}>
          <Text style={[styles.headerTitle, { color: colors.onSurface }]}>SmartRoute</Text>
        </View>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <MaterialIcons name="person" size={18} color={colors.onPrimary} />
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scroll} 
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
          {/* Welcome/Hero Section */}
          <View style={styles.hero}>
            <View style={[styles.heroIconContainer, { backgroundColor: colors.primaryFixed }]}>
              <MaterialIcons name="explore" size={36} color={colors.primary} />
            </View>
            <Text style={[styles.heroTitle, { color: colors.onSurface }]}>Where to today?</Text>
            <Text style={[styles.heroSubtitle, { color: colors.outline }]}>
              Plan your routes, avoid heavy congestion, and optimize departure times with AI.
            </Text>
          </View>

          {/* Primary Option: NLP AI Prompt Input */}
          <TouchableOpacity
            style={[styles.primaryCard, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(tabs)/journey/nlp-input' as any)}
            activeOpacity={0.85}
          >
            <View style={[styles.primaryCardIconBg, { backgroundColor: 'rgba(255, 255, 255, 0.15)' }]}>
              <MaterialIcons name="auto-awesome" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.primaryCardTitle}>Explain My Day</Text>
              <Text style={styles.primaryCardDesc}>
                Describe your stops in one sentence, and let our AI compile the optimal route.
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#FFFFFF" style={styles.cardArrow} />
          </TouchableOpacity>

          {/* Secondary Option: Manual Stop selection */}
          <TouchableOpacity
            style={[styles.itemCard, { backgroundColor: colors.surface }]}
            onPress={() => router.push('/(tabs)/journey/new-stop' as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.itemCardIconBg, { backgroundColor: colors.surfaceLow }]}>
              <MaterialIcons name="add-location" size={22} color={colors.primary} />
            </View>
            <View style={styles.cardContent}>
              <Text style={[styles.itemCardTitle, { color: colors.onSurface }]}>Manual Route Builder</Text>
              <Text style={[styles.itemCardDesc, { color: colors.outline }]}>
                Add address stops manually and configure strict arrival windows.
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.outline} style={styles.cardArrow} />
          </TouchableOpacity>

          {/* Optional Option: Departure suggestions */}
          {currentJourney && currentJourney.status === 'planned' && (
            <TouchableOpacity
              style={[styles.itemCard, { backgroundColor: colors.surface }]}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/journey/departure-suggestions' as any,
                  params: { journeyId: currentJourney.id },
                })
              }
              activeOpacity={0.8}
            >
              <View style={[styles.itemCardIconBg, { backgroundColor: colors.surfaceLow }]}>
                <MaterialIcons name="schedule" size={22} color={colors.primary} />
              </View>
              <View style={styles.cardContent}>
                <Text style={[styles.itemCardTitle, { color: colors.onSurface }]}>Departure Suggestions</Text>
                <Text style={[styles.itemCardDesc, { color: colors.outline }]}>
                  Find the optimal departure time to guarantee arrival targets.
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={colors.outline} style={styles.cardArrow} />
            </TouchableOpacity>
          )}

          {/* Optional Option: Active Plan shortcut */}
          <TouchableOpacity
            style={[styles.shortcutBtn, { backgroundColor: colors.surfaceLow }]}
            onPress={() => router.push('/(tabs)/journey/plan-result' as any)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="map" size={20} color={colors.primary} />
            <Text style={[styles.shortcutBtnText, { color: colors.primary }]}>
              View Current Itinerary Alternatives
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    height: 56,
    paddingHorizontal: Spacing.marginMain,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'System',
    letterSpacing: -0.4,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: Spacing.marginMain,
    paddingTop: Spacing.stackLg,
    paddingBottom: 100, // Padding for absolute bottom tabs
    gap: Spacing.stackLg,
  },
  hero: {
    alignItems: 'center',
    gap: 12,
    marginVertical: Spacing.stackLg,
  },
  heroIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  primaryCard: {
    borderRadius: Rounded.xl,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: 'rgba(42, 20, 180, 0.3)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryCardIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  primaryCardDesc: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.75)',
    lineHeight: 18,
    marginTop: 4,
  },
  itemCard: {
    borderRadius: Rounded.xl,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: 'rgba(0, 0, 0, 0.02)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 1,
  },
  itemCardIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  itemCardDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  cardContent: {
    flex: 1,
  },
  cardArrow: {
    opacity: 0.8,
  },
  shortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: Rounded.xl,
    paddingVertical: 16,
    marginTop: Spacing.stackSm,
  },
  shortcutBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
