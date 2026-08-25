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

export default function LoginScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Entrance choreography
  const backAnim = useRef(new Animated.Value(0)).current;
  const logoAnim = useRef(new Animated.Value(0)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;
  const fieldAnims = useRef([0, 1, 2, 3].map(() => new Animated.Value(0))).current;
  const footerAnim = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(rememberMe ? 1 : 0)).current;
  const errorShake = useRef(new Animated.Value(0)).current;
  const blobDrift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(backAnim, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(logoAnim, { toValue: 1, useNativeDriver: true, damping: 12, stiffness: 130 }),
      Animated.timing(headerAnim, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.stagger(
        80,
        fieldAnims.map((a) =>
          Animated.spring(a, { toValue: 1, useNativeDriver: true, damping: 15, stiffness: 160 })
        )
      ),
      Animated.timing(footerAnim, { toValue: 1, duration: 320, useNativeDriver: true }),
    ]).start();

    const drift = Animated.loop(
      Animated.sequence([
        Animated.timing(blobDrift, { toValue: 1, duration: 5600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(blobDrift, { toValue: 0, duration: 5600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    drift.start();
    return () => drift.stop();
  }, []);

  useEffect(() => {
    Animated.spring(checkScale, {
      toValue: rememberMe ? 1 : 0,
      useNativeDriver: true,
      speed: 30,
      bounciness: 12,
    }).start();
  }, [rememberMe]);

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

  const handleLogin = async () => {
    setError(null);
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
      const response = await authApi.login({ email: email.trim(), password });
      await setAuth(response.accessToken, response.refreshToken, {
        id: response.userId,
        email: response.email,
        fullName: response.fullName,
      }, rememberMe);
    } catch (err: any) {
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.response?.status === 401) {
        setError('E-posta adresi veya şifre hatalı.');
      } else {
        setError('Sunucuya bağlanılamadı. Lütfen internetinizi kontrol edin.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const blobTranslate = blobDrift.interpolate({ inputRange: [0, 1], outputRange: [0, 14] });
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
                <Text style={styles.title}>Tekrar Hoş Geldiniz</Text>
                <Text style={styles.subtitle}>
                  Yolculuklarınıza devam etmek için giriş yapın
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

              <Animated.View style={fieldStyle(fieldAnims[1])}>
                <Input
                  label="Şifre"
                  icon="lock"
                  iconRight={showPass ? 'visibility-off' : 'visibility'}
                  onIconRightPress={() => setShowPass(v => !v)}
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </Animated.View>

              {/* Beni Hatırla Checkbox */}
              <Animated.View style={fieldStyle(fieldAnims[2])}>
                <AnimatedPressable
                  style={styles.rememberMeContainer}
                  onPress={() => setRememberMe(!rememberMe)}
                  scaleTo={0.97}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: rememberMe }}
                  accessibilityLabel="Beni Hatırla"
                >
                  <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                    <Animated.View style={{ transform: [{ scale: checkScale }] }}>
                      <MaterialIcons name="check" size={14} color={C.onPrimary} />
                    </Animated.View>
                  </View>
                  <Text style={styles.rememberMeText}>Beni Hatırla</Text>
                </AnimatedPressable>
              </Animated.View>

              <Animated.View style={fieldStyle(fieldAnims[3])}>
                <Button
                  label="Giriş Yap"
                  onPress={handleLogin}
                  loading={isLoading}
                  disabled={isLoading}
                  fullWidth
                  size="lg"
                  style={styles.loginBtn}
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
              <Text style={styles.footerText}>Hesabınız yok mu?</Text>
              <TouchableOpacity
                onPress={() => router.push('/(auth)/register')}
                disabled={isLoading}
                accessibilityRole="button"
              >
                <Text style={styles.footerLink}>Hesap Oluştur</Text>
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
    top: -60,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: C.primaryFixed,
    opacity: 0.6,
  },
  keyboardView: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
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
    marginTop: Spacing.xl,
    marginBottom: Spacing['2xl'],
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
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginVertical: Spacing.xs,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: Rounded.xs,
    borderWidth: 1.5,
    borderColor: C.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  rememberMeText: {
    ...Typography.bodySmall,
    color: C.textSecondary,
    fontWeight: '500',
  },
  loginBtn: {
    marginTop: Spacing.sm,
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