import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Rounded, Typography } from '@/constants/theme';

const C = Colors.light;

const STATUS_MESSAGES = [
  'Trafik modelleri analiz ediliyor...',
  'Yükseklik değişimleri değerlendiriliyor...',
  'Optimum yakıt verimliliği hesaplanıyor...',
  'Canlı hava durumu verileri kontrol ediliyor...',
  'Minimum stres için optimize ediliyor...',
  'Mükemmel yolculuğunuz tamamlanıyor...',
];

export default function OptimizingScreen() {
  const router = useRouter();
  const [statusIndex, setStatusIndex] = useState(0);

  // Animations
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim1 = useRef(new Animated.Value(1)).current;
  const pulseOpacity1 = useRef(new Animated.Value(0.4)).current;
  const pulseAnim2 = useRef(new Animated.Value(1)).current;
  const pulseOpacity2 = useRef(new Animated.Value(0.3)).current;
  const fadeText = useRef(new Animated.Value(1)).current;

  // Dot bounces
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Continuous rotation
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Pulse ring 1
    Animated.loop(
      Animated.parallel([
        Animated.timing(pulseAnim1, {
          toValue: 1.8,
          duration: 2400,
          useNativeDriver: true,
        }),
        Animated.timing(pulseOpacity1, {
          toValue: 0,
          duration: 2400,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Pulse ring 2 (offset)
    setTimeout(() => {
      Animated.loop(
        Animated.parallel([
          Animated.timing(pulseAnim2, {
            toValue: 1.8,
            duration: 2400,
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity2, {
            toValue: 0,
            duration: 2400,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, 600);

    // Bouncing dots sequence
    const bounceDot = (anim: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: -8,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.delay(700 - delay),
        ])
      ).start();
    };

    bounceDot(dot1, 0);
    bounceDot(dot2, 160);
    bounceDot(dot3, 320);

    // Cycle text messages every 2.5 seconds
    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(fadeText, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(fadeText, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();

      setStatusIndex((prev) => (prev + 1) % STATUS_MESSAGES.length);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      <View style={styles.content}>
        {/* Animated Central Ring & Icon */}
        <View style={styles.spinnerWrapper}>
          <Animated.View
            style={[
              styles.pulseRing,
              {
                transform: [{ scale: pulseAnim1 }],
                opacity: pulseOpacity1,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.pulseRing,
              {
                transform: [{ scale: pulseAnim2 }],
                opacity: pulseOpacity2,
              },
            ]}
          />

          <View style={styles.centerDisc}>
            <Animated.View
              style={[
                styles.spinnerBorder,
                {
                  transform: [{ rotate: spin }],
                },
              ]}
            />
            <View style={styles.innerCore}>
              <MaterialIcons name="explore" size={44} color={C.primary} />
              <View style={styles.sparkleBadge}>
                <MaterialIcons name="auto-awesome" size={14} color={C.secondary} />
              </View>
            </View>
          </View>
        </View>

        {/* Dynamic Titles */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>Rotanız Oluşturuluyor</Text>
          <Animated.View style={{ opacity: fadeText, height: 24, justifyContent: 'center' }}>
            <Text style={styles.statusMessage}>{STATUS_MESSAGES[statusIndex]}</Text>
          </Animated.View>
        </View>

        {/* Progress Bouncing Dots */}
        <View style={styles.dotsRow}>
          <Animated.View style={[styles.dot, { transform: [{ translateY: dot1 }] }]} />
          <Animated.View style={[styles.dot, { transform: [{ translateY: dot2 }] }]} />
          <Animated.View style={[styles.dot, { transform: [{ translateY: dot3 }] }]} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xl,
  },
  spinnerWrapper: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: C.primary,
  },
  centerDisc: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  spinnerBorder: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: 'transparent',
    borderTopColor: C.primary,
    borderRightColor: C.secondary,
  },
  innerCore: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  sparkleBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
  },
  textContainer: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  title: {
    ...Typography.h2,
    color: C.text,
  },
  statusMessage: {
    ...Typography.bodyMedium,
    color: C.textSecondary,
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.primary,
  },
});
