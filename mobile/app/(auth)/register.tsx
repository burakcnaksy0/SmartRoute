import React, { useEffect, useRef, useState } from 'react';
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

const C = Colors.light;

export default function RegisterScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const logoAnim = useRef(new Animated.Value(0.86)).current;
  const blobAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 550,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(logoAnim, {
        toValue: 1,
        friction: 7,
        tension: 55,
        useNativeDriver: true,
      }),
    ]).start();

    const blobLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(blobAnim, { toValue: 1, duration: 4200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(blobAnim, { toValue: 0, duration: 4200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    blobLoop.start();
    return () => blobLoop.stop();
  }, [blobAnim, fadeAnim, logoAnim, slideAnim]);

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
      });
      await setAuth(response.accessToken, response.refreshToken, {
        id: response.userId,
        email: response.email,
        fullName: response.fullName,
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

  return (
    <Animated.View style={[styles.root, { opacity: fadeAnim }]}>
      <StatusBar style="dark" />
      <Animated.View
        style={[
          styles.decorBlob,
          { transform: [{ translateX: blobAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -18] }) }, { scale: blobAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }] },
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
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Geri git"
            >
              <MaterialIcons name="chevron-left" size={24} color={C.primary} />
              <Text style={styles.backText}>Geri</Text>
            </TouchableOpacity>

            {/* Header */}
            <Animated.View style={[styles.header, { transform: [{ translateY: slideAnim }] }]}>
              <Animated.View style={[styles.logoMark, { transform: [{ scale: logoAnim }] }]}>
                <MaterialIcons name="explore" size={28} color={C.onPrimary} />
              </Animated.View>
              <Text style={styles.title}>Hesap Oluştur</Text>
              <Text style={styles.subtitle}>
                SmartRoute'a katılın ve rotalarınızı optimize etmeye başlayın
              </Text>
            </Animated.View>

            {/* Form */}
            <Animated.View style={[styles.form, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              {error && <ErrorBanner message={error} />}

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

            {/* Footer */}
            <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
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
    </Animated.View>
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
    alignSelf: 'flex-start',
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
  logoMark: {
    width: 68,
    height: 68,
    borderRadius: Rounded['2xl'],
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.primary,
    marginBottom: Spacing.xs,
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
  },
  form: {
    gap: Spacing.base,
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
