import React, { useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/api/auth';
import { SafeAreaView } from 'react-native-safe-area-context';

const VEHICLE_TYPES = [
  { id: 'gasoline', name: 'Benzinli', icon: '🚗' },
  { id: 'diesel', name: 'Dizel', icon: '🚙' },
  { id: 'electric', name: 'Elektrikli', icon: '⚡' },
  { id: 'hybrid', name: 'Hibrit', icon: '🔌' },
  { id: 'bicycle', name: 'Bisiklet', icon: '🚲' },
  { id: 'walking', name: 'Yaya', icon: '🚶' },
];

export default function RegisterScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [defaultVehicleType, setDefaultVehicleType] = useState('electric');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    setError(null);

    // Full name validation
    if (!fullName || fullName.trim().length < 2) {
      setError('Lütfen geçerli bir ad soyad girin.');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      setError('Lütfen geçerli bir e-posta adresi girin.');
      return;
    }

    // Password validation
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

      await setAuth(
        response.accessToken,
        response.refreshToken,
        {
          id: response.userId,
          email: response.email,
          fullName: response.fullName,
          defaultVehicleType,
        }
      );
    } catch (err: any) {
      console.error(err);
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
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <SafeAreaView style={styles.innerContainer}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <View style={styles.logoBadge}>
                <ThemedText style={styles.logoText}>SR</ThemedText>
              </View>
              <ThemedText type="title" style={styles.title}>
                Hesap Oluştur
              </ThemedText>
              <ThemedText style={styles.subtitle}>
                SmartRoute ailesine katılarak akıllı rotalamaya başlayın
              </ThemedText>
            </View>

            <View style={styles.form}>
              {error && (
                <View style={styles.errorBanner}>
                  <ThemedText style={styles.errorText}>{error}</ThemedText>
                </View>
              )}

              <View style={styles.inputContainer}>
                <ThemedText style={styles.label}>Ad Soyad</ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="Ahmet Yılmaz"
                  placeholderTextColor="#64748B"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <ThemedText style={styles.label}>E-Posta Adresi</ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="ornek@domain.com"
                  placeholderTextColor="#64748B"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <ThemedText style={styles.label}>Şifre</ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#64748B"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <ThemedText style={styles.label}>Varsayılan Ulaşım Türü</ThemedText>
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
                      >
                        <ThemedText style={styles.vehicleIcon}>{v.icon}</ThemedText>
                        <ThemedText
                          style={[
                            styles.vehicleName,
                            isSelected && styles.vehicleNameSelected,
                          ]}
                        >
                          {v.name}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.registerButton, isLoading && styles.registerButtonDisabled]}
                onPress={handleRegister}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <ThemedText style={styles.registerButtonText}>Kayıt Ol</ThemedText>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.loginLink}
                onPress={() => router.back()}
                disabled={isLoading}
              >
                <ThemedText style={styles.loginLinkText}>
                  Zaten bir hesabınız var mı? <ThemedText style={styles.loginLinkHighlight}>Giriş Yapın</ThemedText>
                </ThemedText>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  keyboardView: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
    gap: 8,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 8,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  form: {
    gap: 16,
    width: '100%',
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  inputContainer: {
    gap: 6,
  },
  label: {
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#F1F5F9',
    fontSize: 16,
  },
  vehicleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  vehicleCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  vehicleCardSelected: {
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    borderColor: '#2563EB',
    borderWidth: 1.5,
  },
  vehicleIcon: {
    fontSize: 22,
  },
  vehicleName: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
  vehicleNameSelected: {
    color: '#38BDF8',
    fontWeight: '600',
  },
  registerButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
    marginTop: 8,
  },
  registerButtonDisabled: {
    backgroundColor: 'rgba(37, 99, 235, 0.5)',
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: 24,
  },
  loginLink: {
    padding: 8,
  },
  loginLinkText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  loginLinkHighlight: {
    color: '#38BDF8',
    fontWeight: '600',
  },
});
