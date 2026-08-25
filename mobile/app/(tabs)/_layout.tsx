import { Tabs, useRouter, useSegments } from 'expo-router';
import { Colors, Rounded, Shadow, Spacing, TabBarHeight, Typography } from '@/constants/theme';
import { MaterialIcons } from '@expo/vector-icons';
import {
  View,
  Platform,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
} from 'react-native';
import { useJourneyStore } from '@/store/journeyStore';
import { useRef, useEffect } from 'react';

const C = Colors.light;

export default function TabLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { currentJourney, completedStopIds } = useJourneyStore();

  // Hide tab bar when user navigates into any sub-screen (e.g. /journey/preferences, /journey/new-stop, etc.)
  const isSubScreen = segments.length > 2;

  const isActive = currentJourney && currentJourney.status === 'active';
  const stopsSorted = [...(currentJourney?.stops ?? [])].sort(
    (a, b) => (a.optimizedOrder ?? a.sequenceOrder) - (b.optimizedOrder ?? b.sequenceOrder)
  );
  const nextStop = stopsSorted.find(s => !completedStopIds.includes(s.id));

  // Active journey banner animation
  const stripAnim  = useRef(new Animated.Value(0)).current;
  const stripScale = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    if (isActive && nextStop && !isSubScreen) {
      Animated.parallel([
        Animated.spring(stripAnim, { toValue: 1, useNativeDriver: true, damping: 16, stiffness: 120 }),
        Animated.spring(stripScale, { toValue: 1, useNativeDriver: true, damping: 16, stiffness: 120 }),
      ]).start();
    } else {
      Animated.timing(stripAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [isActive, nextStop?.id, isSubScreen]);

  const stripBottom = Platform.OS === 'ios' ? 98 : 78;

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: C.primary,
          tabBarInactiveTintColor: C.outline,
          tabBarLabelStyle: {
            ...Typography.caption,
            fontWeight: '600',
            marginTop: -2,
          },
          tabBarStyle: isSubScreen
            ? { display: 'none' }
            : {
                backgroundColor: 'rgba(255, 255, 255, 0.96)',
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: C.outlineVariant,
                elevation: 0,
                shadowColor: '#0F1523',
                shadowOffset: { width: 0, height: -1 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: TabBarHeight,
                paddingBottom: Platform.OS === 'ios' ? 28 : 12,
                paddingTop: 8,
              },
          tabBarIconStyle: {
            marginTop: 2,
          },
        }}
      >
        <Tabs.Screen
          name="journey"
          options={{
            title: 'Yolculuk',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="explore" color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'Geçmiş',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="history" color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="vehicles"
          options={{
            title: 'Araçlar',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="directions-car" color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Ayarlar',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="settings" color={color} focused={focused} />
            ),
          }}
        />
      </Tabs>
 
      {/* Active journey floating strip - only on root tab screens */}
      {isActive && nextStop && !isSubScreen && (
        <Animated.View
          style={[
            styles.stripWrapper,
            {
              bottom: stripBottom,
              opacity: stripAnim,
              transform: [{ scale: stripScale }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.strip}
            onPress={() => router.push('/(tabs)/journey/active-journey' as any)}
            activeOpacity={0.9}
          >
            <View style={styles.stripLeft}>
              <View style={styles.stripPulse}>
                <View style={styles.stripPulseDot} />
              </View>
              <View style={styles.stripText}>
                <Text style={styles.stripLabel}>AKTİF YOLCULUK</Text>
                <Text style={styles.stripNext} numberOfLines={1}>
                  Sıradaki: {nextStop.placeName}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
              <TouchableOpacity
                style={styles.stripCancelBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  Alert.alert('Yolculuğu Bitir', 'Mevcut yolculuğu sonlandırmak istediğinize emin misiniz?', [
                    { text: 'Vazgeç', style: 'cancel' },
                    { text: 'Bitir', style: 'destructive', onPress: () => useJourneyStore.getState().reset() },
                  ]);
                }}
              >
                <MaterialIcons name="close" size={20} color={C.error} />
              </TouchableOpacity>
              <View style={styles.stripChevron}>
                <MaterialIcons name="chevron-right" size={20} color={C.primary} />
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

/**
 * Custom tab icon with active indicator dot
 */
function TabIcon({
  name,
  color,
  focused,
}: {
  name: keyof typeof MaterialIcons.glyphMap;
  color: string;
  focused: boolean;
}) {
  return (
    <View style={tabIconStyles.container}>
      <MaterialIcons name={name} size={24} color={color} />
      {focused && <View style={tabIconStyles.dot} />}
    </View>
  );
}

const tabIconStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 3,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.primary,
  },
});

const styles = StyleSheet.create({
  stripWrapper: {
    position: 'absolute',
    left: Spacing.base,
    right: Spacing.base,
  },
  strip: {
    backgroundColor: C.surface,
    borderRadius: Rounded.xl,
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadow.lg,
    borderWidth: 1,
    borderColor: C.primaryFixed,
  },
  stripLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  stripPulse: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stripPulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.primary,
  },
  stripText: {
    flex: 1,
    gap: 2,
  },
  stripLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: C.primary,
  },
  stripNext: {
    ...Typography.h4,
    color: C.text,
    fontSize: 14,
  },
  stripChevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stripCancelBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.errorContainer || '#FFDAD6',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
