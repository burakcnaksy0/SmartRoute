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

const VEHICLE_TYPES = [
  { id: 'gasoline',  name: 'Benzinli',  icon: 'directions-car' as const },
  { id: 'diesel',    name: 'Dizel',    icon: 'local-gas-station' as const },
  { id: 'electric',  name: 'Elektrikli',  icon: 'electric-car' as const },
  { id: 'hybrid',    name: 'Hibrit',    icon: 'electric-bolt' as const },
  { id: 'bicycle',   name: 'Bisiklet',   icon: 'directions-bike' as const },
  { id: 'walking',   name: 'Yaya',   icon: 'directions-walk' as const },
];

export default function RegisterScreen() {
  const router  = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [fullName,            setFullName]            = useState('');
  const [email,               setEmail]               = useState('');
  const [password,            setPassword]            = useState('');
  const [showPass,            setShowPass]            = useState(false);
  const [defaultVehicleType,  setDefaultVehicleType]  = useState('electric');
  const [error,               setError]               = useState<string | null>(null);
  const [isLoading,           setIsLoading]           = useState(false);

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
              <Text style={styles.title}>Hesap Oluştur</Text>
              <Text style={styles.subtitle}>
                SmartRoute'a katılın ve rotalarınızı optimize etmeye başlayın
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
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

              {/* Vehicle type selector */}
              <View style={styles.vehicleSection}>
                <Text style={styles.vehicleLabel}>Varsayılan Ulaşım Modu</Text>
                <View style={styles.vehicleGrid}>
                  {VEHICLE_TYPES.map((v) => {
                    const isSelected = defaultVehicleType === v.id;
                    return (
                      <TouchableOpacity
                        key={v.id}
                        style={[
                          styles.vehicleCard,
                          isSelected && styles.vehicleCardSelected,
                        ]}
                        onPress={() => setDefaultVehicleType(v.id)}
                        disabled={isLoading}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isSelected }}
                      >
                        <MaterialIcons
                          name={v.icon}
                          size={22}
                          color={isSelected ? C.primary : C.outline}
                        />
                        <Text
                          style={[
                            styles.vehicleName,
                            isSelected && styles.vehicleNameSelected,
                          ]}
                        >
                          {v.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <Button
                label="Hesap Oluştur"
                onPress={handleRegister}
                loading={isLoading}
                disabled={isLoading}
                fullWidth
                size="lg"
                style={{ marginTop: Spacing.sm }}
              />
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Zaten hesabınız var mı?</Text>
              <TouchableOpacity
                onPress={() => router.back()}
                disabled={isLoading}
                accessibilityRole="button"
              >
                <Text style={styles.footerLink}>Giriş Yap</Text>
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
    top: -40,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: C.primaryFixed,
    opacity: 0.5,
  },
  keyboardView: { flex: 1 },
  safeArea:    { flex: 1 },
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
    flex: 1,
    minWidth: '30%',
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
