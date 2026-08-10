import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
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

export default function LoginScreen() {
  const router   = useRouter();
  const setAuth  = useAuthStore((s) => s.setAuth);

  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [showPass,  setShowPass]  = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
        id:       response.userId,
        email:    response.email,
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

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.decorBlob} />

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
            <View style={styles.header}>
              <View style={styles.logoMark}>
                <MaterialIcons name="explore" size={28} color={C.onPrimary} />
              </View>
              <Text style={styles.title}>Tekrar Hoş Geldiniz</Text>
              <Text style={styles.subtitle}>
                Yolculuklarınıza devam etmek için giriş yapın
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {error && <ErrorBanner message={error} />}

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
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />

              {/* Beni Hatırla Checkbox */}
              <TouchableOpacity
                style={styles.rememberMeContainer}
                onPress={() => setRememberMe(!rememberMe)}
                activeOpacity={0.7}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: rememberMe }}
                accessibilityLabel="Beni Hatırla"
              >
                <View style={[
                  styles.checkbox,
                  rememberMe && styles.checkboxChecked
                ]}>
                  {rememberMe && <MaterialIcons name="check" size={14} color={C.onPrimary} />}
                </View>
                <Text style={styles.rememberMeText}>Beni Hatırla</Text>
              </TouchableOpacity>

              <Button
                label="Giriş Yap"
                onPress={handleLogin}
                loading={isLoading}
                disabled={isLoading}
                fullWidth
                size="lg"
                style={styles.loginBtn}
              />
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Hesabınız yok mu?</Text>
              <TouchableOpacity
                onPress={() => router.push('/(auth)/register')}
                disabled={isLoading}
                accessibilityRole="button"
              >
                <Text style={styles.footerLink}>Hesap Oluştur</Text>
              </TouchableOpacity>
            </View>
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
    marginTop: Spacing.xl,
    marginBottom: Spacing['2xl'],
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
