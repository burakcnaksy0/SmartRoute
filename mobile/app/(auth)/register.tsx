import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/api/auth';
import { Colors, Spacing, Rounded, Shadow, Typography } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ErrorBanner } from '@/components/ui/States';
import { OrbitRing } from '@/components/ui/OrbitRing';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';

const C = Colors.light;

const VEHICLE_TYPES = [
  { id: 'gasoline', name: 'Benzinli', icon: 'directions-car' as const },
  { id: 'diesel', name: 'Dizel', icon: 'local-gas-station' as const },
  { id: 'electric', name: 'Elektrikli', icon: 'electric-car' as const },
  { id: 'hybrid', name: 'Hibrit', icon: 'electric-bolt' as const },
  { id: 'bicycle', name: 'Bisiklet', icon: 'directions-bike' as const },
  { id: 'walking', name: 'Yaya', icon: 'directions-walk' as const },
];

export default function RegisterScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [defaultVehicleType, setDefaultVehicleType] = useState('electric');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Entrance choreography
  const backAnim = useRef(new Animated.Value(0)).current;
  const logoAnim = useRef(new Animated.Value(0)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;
  const fieldAnims = useRef([0, 1, 2, 3, 4].map(() => new Animated.Value(0))).current;
  const vehicleAnims = useRef(VEHICLE_TYPES.map(() => new Animated.Value(0))).current;
  const vehiclePop = useRef(VEHICLE_TYPES.map(() => new Animated.Value(1))).current;
  const footerAnim = useRef(new Animated.Value(0)).current;
  const errorShake = useRef(new Animated.Value(0)).current;
  const blobDrift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(backAnim, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(logoAnim, { toValue: 1, useNativeDriver: true, damping: 12, stiffness: 130 }),
      Animated.timing(headerAnim, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.stagger(
        70,
        fieldAnims.map((a) =>
          Animated.spring(a, { toValue: 1, useNativeDriver: true, damping: 15, stiffness: 160 })
        )
      ),
      Animated.stagger(
        40,
        vehicleAnims.map((a) =>
          Animated.spring(a, { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 180 })
        )
      ),
      Animated.timing(footerAnim, { toValue: 1, duration: 320, useNativeDriver: true }),
    ]).start();

    const drift = Animated.loop(
      Animated.sequence([
        Animated.timing(blobDrift, { toValue: 1, duration: 5200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(blobDrift, { toValue: 0, duration: 5200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    drift.start();
    return () => drift.stop();
  }, []);

  useEffect(() => {
    if (error) {
      errorShake.setValue(0);
      Animated.sequence([
        Animated.timing(errorShake, { toValue: 1, duration: 55, useNativeDriver: true }),
        Animated.timing(errorShake, { toValue: -1, duration: 55, useNativeDriver: true }),
        Animated.timing(errorShake, { toValue: 1, duration: 55, useNativeDriver: true }),
        Animated.timing(errorShake, { toValue: 0, duration: 55, useNativeDriver: true }),
      ]).start();
    }
  }, [error]);

  const handleSelectVehicle = (id: string, index: number) => {
    setDefaultVehicleType(id);
    Animated.sequence([
      Animated.spring(vehiclePop[index], { toValue: 1.08, useNativeDriver: true, speed: 40, bounciness: 10 }),
      Animated.spring(vehiclePop[index], { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 8 }),
    ]).start();
  };

  const handleRegister = async () => {
    setError(null);
    if (!fullName || fullName.trim().length < 2) {
      setError('Lütfen geçerli bir ad soyad girin.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      setError('Lütfen geçerli bir e-posta adresi girin.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Şifreniz en az 6 karakter olmalıdır.');
      return;
    }
    setIsLoading(true);
    try {
      const response = await authApi.register({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        defaultVehicleType,
      });
      await setAuth(response.accessToken, response.refreshToken, {
        id: response.userId,
        email: response.email,
        fullName: response.fullName,
        defaultVehicleType,
      });
    } catch (err: any) {
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.response?.status === 409) {
        setError('Bu e-posta adresi zaten kullanımda.');
      } else {
        setError('Sunucuya bağlanılamadı. Lütfen internetinizi kontrol edin.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const blobTranslate = blobDrift.interpolate({ inputRange: [0, 1], outputRange: [0, -16] });
  const shakeTranslate = errorShake.interpolate({ inputRange: [-1, 1], outputRange: [-8, 8] });

  const fieldStyle = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
  });

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <Animated.View
        style={[
          styles.decorBlob,
          { transform: [{ translateX: blobTranslate }, { translateY: blobTranslate }] },
        ]}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Back */}
            <Animated.View style={{ opacity: backAnim, alignSelf: 'flex-start' }}>
              <AnimatedPressable
                style={styles.backBtn}
                onPress={() => router.back()}
                scaleTo={0.9}
                accessibilityRole="button"
                accessibilityLabel="Geri git"
              >
                <MaterialIcons name="chevron-left" size={24} color={C.primary} />
                <Text style={styles.backText}>Geri</Text>
              </AnimatedPressable>
            </Animated.View>

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoWrapper}>
                <OrbitRing size={92} primaryColor={C.primary} secondaryColor={C.secondary} />
                <Animated.View
                  style={[
                    styles.logoMark,
                    {
                      opacity: logoAnim,
                      transform: [{ scale: logoAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
                    },
                  ]}
                >
                  <MaterialIcons name="explore" size={28} color={C.onPrimary} />
                </Animated.View>
              </View>

              <Animated.View
                style={{
                  opacity: headerAnim,
                  transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
                }}
              >
                <Text style={styles.title}>Hesap Oluştur</Text>
                <Text style={styles.subtitle}>
                  SmartRoute'a katılın ve rotalarınızı optimize etmeye başlayın
                </Text>
              </Animated.View>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {error && (
                <Animated.View style={{ transform: [{ translateX: shakeTranslate }] }}>
                  <ErrorBanner message={error} />
                </Animated.View>
              )}

              <Animated.View style={fieldStyle(fieldAnims[0])}>
                <Input
                  label="Ad Soyad"
                  icon="person"
                  placeholder="Ahmet Yılmaz"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </Animated.View>

              <Animated.View style={fieldStyle(fieldAnims[1])}>
                <Input
                  label="E-posta Adresi"
                  icon="email"
                  placeholder="you@example.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </Animated.View>

              <Animated.View style={fieldStyle(fieldAnims[2])}>
                <Input
                  label="Şifre"
                  icon="lock"
                  iconRight={showPass ? 'visibility-off' : 'visibility'}
                  onIconRightPress={() => setShowPass(v => !v)}
                  placeholder="En az 6 karakter"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                  hint="En az 6 karakter girilmelidir"
                />
              </Animated.View>


              <Animated.View style={fieldStyle(fieldAnims[4])}>
                <Button
                  label="Hesap Oluştur"
                  onPress={handleRegister}
                  loading={isLoading}
                  disabled={isLoading}
                  fullWidth
                  size="lg"
                  style={{ marginTop: Spacing.sm }}
                />
              </Animated.View>
            </View>

            {/* Footer */}
            <Animated.View
              style={[
                styles.footer,
                {
                  opacity: footerAnim,
                  transform: [{ translateY: footerAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
                },
              ]}
            >
              <Text style={styles.footerText}>Zaten hesabınız var mı?</Text>
              <TouchableOpacity
                onPress={() => router.back()}
                disabled={isLoading}
                accessibilityRole="button"
              >
                <Text style={styles.footerLink}>Giriş Yap</Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.background,
  },
  decorBlob: {
    position: 'absolute',
    top: -40,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: C.primaryFixed,
    opacity: 0.5,
  },
  keyboardView: { flex: 1 },
  safeArea: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.gutter,
    paddingBottom: Spacing['3xl'],
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingRight: Spacing.sm,
  },
  backText: {
    ...Typography.bodyMedium,
    color: C.primary,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.base,
    marginBottom: Spacing.xl,
  },
  logoWrapper: {
    width: 92,
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  logoMark: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: Rounded['2xl'],
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.primary,
  },
  title: {
    ...Typography.h1,
    color: C.text,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.bodyMedium,
    color: C.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  form: {
    gap: Spacing.base,
  },
  vehicleSection: {
    gap: Spacing.sm,
  },
  vehicleLabel: {
    ...Typography.label,
    color: C.text,
  },
  vehicleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  vehicleCard: {
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: C.outlineVariant,
    borderRadius: Rounded.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    ...Shadow.sm,
  },
  vehicleCardSelected: {
    backgroundColor: C.primaryFixed,
    borderColor: C.primary,
  },
  vehicleName: {
    ...Typography.caption,
    color: C.outline,
    fontWeight: '500',
    textAlign: 'center',
  },
  vehicleNameSelected: {
    color: C.primary,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing['2xl'],
  },
  footerText: {
    ...Typography.body,
    color: C.textSecondary,
  },
  footerLink: {
    ...Typography.body,
    color: C.primary,
    fontWeight: '600',
  },
});