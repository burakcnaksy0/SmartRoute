import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Rounded, Shadow, Typography } from '@/constants/theme';
import { Button } from '@/components/ui/Button';

const { width } = Dimensions.get('window');
const C = Colors.light;

const FEATURES = [
  { icon: 'auto-awesome' as const, label: 'Yapay Zeka Destekli Rotalar' },
  { icon: 'schedule' as const,     label: 'Akıllı Çıkış Saati' },
  { icon: 'traffic' as const,      label: 'Canlı Trafik Bilgisi' },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const slideAnim  = useRef(new Animated.Value(24)).current;
  const badgeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
      Animated.timing(badgeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* Decorative background blobs */}
      <View style={styles.blobTop} />
      <View style={styles.blobBottom} />

      <SafeAreaView style={styles.safeArea}>
        {/* Hero section */}
        <Animated.View
          style={[
            styles.hero,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Logo mark */}
          <View style={styles.logoMark}>
            <MaterialIcons name="explore" size={36} color={C.onPrimary} />
          </View>

          <Text style={styles.appName}>SmartRoute</Text>
          <Text style={styles.tagline}>
            Çok duraklı yolculuk planlaması,{'\n'}yapay zeka ile optimize edildi.
          </Text>

          {/* Feature pills */}
          <Animated.View style={[styles.features, { opacity: badgeAnim }]}>
            {FEATURES.map((f) => (
              <View key={f.label} style={styles.featurePill}>
                <MaterialIcons name={f.icon} size={14} color={C.primary} />
                <Text style={styles.featureLabel}>{f.label}</Text>
              </View>
            ))}
          </Animated.View>
        </Animated.View>

        {/* CTA section */}
        <Animated.View style={[styles.cta, { opacity: fadeAnim }]}>
          <Button
            label="Başlayın"
            variant="primary"
            size="lg"
            fullWidth
            onPress={() => router.push('/(auth)/register')}
          />
          <Button
            label="Giriş Yap"
            variant="outline"
            size="lg"
            fullWidth
            onPress={() => router.push('/(auth)/login')}
          />
          <Text style={styles.termsText}>
            Devam ederek Kullanım Koşullarımızı kabul etmiş olursunuz
          </Text>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.background,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.gutter,
    paddingBottom: Spacing.xl,
  },
  // Decorative blobs
  blobTop: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: C.primaryFixed,
    opacity: 0.7,
  },
  blobBottom: {
    position: 'absolute',
    bottom: -100,
    left: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: C.secondaryContainer,
    opacity: 0.35,
  },
  // Hero
  hero: {
    alignItems: 'center',
    gap: Spacing.base,
    marginTop: Spacing['3xl'],
  },
  logoMark: {
    width: 84,
    height: 84,
    borderRadius: Rounded['2xl'],
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.primary,
    marginBottom: Spacing.sm,
  },
  appName: {
    ...Typography.display,
    color: C.text,
    textAlign: 'center',
  },
  tagline: {
    ...Typography.bodyMedium,
    color: C.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  features: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.primaryFixed,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Rounded.full,
  },
  featureLabel: {
    ...Typography.caption,
    color: C.primary,
    fontWeight: '600',
  },
  // CTA
  cta: {
    gap: Spacing.sm,
    alignItems: 'center',
  },
  termsText: {
    ...Typography.caption,
    color: C.outline,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
});
