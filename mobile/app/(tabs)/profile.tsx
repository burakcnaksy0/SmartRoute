import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Rounded, Shadow, Typography, TabBarHeight } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { authApi } from '@/api/auth';
import { Button } from '@/components/ui/Button';
import { SectionHeader } from '@/components/ui/Badge';

const C = Colors.light;

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const [logoutLoading,      setLogoutLoading]      = useState(false);

  const {
    mapProvider,
    distanceUnit,
    language,
    departureAlerts,
    serviceDisruptions,
    fetchSettings,
    updateSettings,
  } = useSettingsStore();

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    fetchSettings();
  }, []);

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await authApi.logout();
    } catch {}
    finally {
      await logout();
      setLogoutLoading(false);
    }
  };

  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />

      <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Ayarlar</Text>
          </View>

          {/* Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.fullName ?? 'Misafir Kullanıcı'}</Text>
              <Text style={styles.profileEmail}>{user?.email ?? '—'}</Text>
            </View>
            <TouchableOpacity
              style={styles.editProfileBtn}
              accessibilityRole="button"
              accessibilityLabel="Profili düzenle"
            >
              <MaterialIcons name="edit" size={18} color={C.primary} />
            </TouchableOpacity>
          </View>

          {/* Preferences */}
          <SectionHeader title="Tercihler" />
          <View style={styles.settingsGroup}>
            <SettingsRow
              icon="map"
              label="Harita Sağlayıcısı"
              value={mapProvider}
              onPress={() => {
                Alert.alert(
                  'Harita Sağlayıcısı Seçin',
                  'Varsayılan harita uygulamasını seçin.',
                  [
                    { text: 'OpenStreetMap', onPress: () => updateSettings({ mapProvider: 'OpenStreetMap' }) },
                    { text: 'Apple Haritalar', onPress: () => updateSettings({ mapProvider: 'Apple Haritalar' }) },
                    { text: 'İptal', style: 'cancel' }
                  ]
                );
              }}
            />
            <View style={styles.rowDivider} />
            <SettingsRow
              icon="straighten"
              label="Mesafe Birimi"
              value={distanceUnit}
              onPress={() => {
                Alert.alert(
                  'Mesafe Birimi Seçin',
                  'Kullanılacak mesafe ölçü birimini seçin.',
                  [
                    { text: 'Kilometre (km)', onPress: () => updateSettings({ distanceUnit: 'Kilometre' }) },
                    { text: 'Mil (mi)', onPress: () => updateSettings({ distanceUnit: 'Mil' }) },
                    { text: 'İptal', style: 'cancel' }
                  ]
                );
              }}
            />
            <View style={styles.rowDivider} />
            <SettingsRow
              icon="language"
              label="Dil"
              value={language}
              onPress={() => {
                Alert.alert(
                  'Dil Seçin / Select Language',
                  'Uygulama dilini seçin.',
                  [
                    { text: 'Türkçe', onPress: () => updateSettings({ language: 'Türkçe' }) },
                    { text: 'English', onPress: () => updateSettings({ language: 'English' }) },
                    { text: 'İptal', style: 'cancel' }
                  ]
                );
              }}
            />
          </View>

          {/* Notifications */}
          <SectionHeader title="Bildirimler" />
          <View style={styles.settingsGroup}>
            <ToggleRow
              icon="notifications-active"
              label="Hareket Alarmları"
              description="Yola çıkma zamanı geldiğinde bildir"
              value={departureAlerts}
              onChange={(val) => updateSettings({ departureAlerts: val })}
            />
            <View style={styles.rowDivider} />
            <ToggleRow
              icon="warning-amber"
              label="Hizmet Kesintileri"
              description="Rota gecikmeleri için uyarılar"
              value={serviceDisruptions}
              onChange={(val) => updateSettings({ serviceDisruptions: val })}
            />
          </View>

          {/* About */}
          <SectionHeader title="Hakkında" />
          <View style={styles.settingsGroup}>
            <SettingsRow
              icon="info"
              label="Sürüm"
              value="1.0.0"
            />
            <View style={styles.rowDivider} />
            <SettingsRow
              icon="privacy-tip"
              label="Gizlilik Politikası"
              onPress={() => {}}
            />
            <View style={styles.rowDivider} />
            <SettingsRow
              icon="description"
              label="Kullanım Koşulları"
              onPress={() => {}}
            />
          </View>

          {/* Sign Out */}
          <View style={styles.signOutWrapper}>
            <Button
              label="Çıkış Yap"
              variant="danger"
              size="lg"
              fullWidth
              loading={logoutLoading}
              onPress={handleLogout}
            />
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SettingsRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  const content = (
    <View style={rowStyles.row}>
      <View style={rowStyles.iconBg}>
        <MaterialIcons name={icon} size={18} color={C.primary} />
      </View>
      <Text style={rowStyles.label}>{label}</Text>
      <View style={rowStyles.right}>
        {value && <Text style={rowStyles.value}>{value}</Text>}
        {onPress && <MaterialIcons name="chevron-right" size={20} color={C.outline} />}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} accessibilityRole="button">
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

function ToggleRow({
  icon,
  label,
  description,
  value,
  onChange,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={rowStyles.row}>
      <View style={rowStyles.iconBg}>
        <MaterialIcons name={icon} size={18} color={C.primary} />
      </View>
      <View style={rowStyles.toggleContent}>
        <Text style={rowStyles.label}>{label}</Text>
        <Text style={rowStyles.desc}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: C.surfaceContainerHigh, true: C.primary }}
        thumbColor={Platform.OS === 'ios' ? undefined : '#FFFFFF'}
        accessibilityRole="switch"
      />
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  iconBg: {
    width: 34,
    height: 34,
    borderRadius: Rounded.default,
    backgroundColor: C.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  label: {
    ...Typography.bodyMedium,
    color: C.text,
    flex: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  value: {
    ...Typography.bodySmall,
    color: C.textSecondary,
  },
  toggleContent: {
    flex: 1,
    gap: 2,
  },
  desc: {
    ...Typography.caption,
    color: C.textSecondary,
  },
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.background,
  },
  scroll: {
    paddingHorizontal: Spacing.gutter,
    paddingBottom: TabBarHeight + Spacing['2xl'],
  },
  header: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.base,
  },
  headerTitle: {
    ...Typography.h1,
    color: C.text,
  },
  // Profile card
  profileCard: {
    backgroundColor: C.surface,
    borderRadius: Rounded.xl,
    padding: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
    ...Shadow.md,
  },
  avatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    color: C.onPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
    gap: 3,
  },
  profileName: {
    ...Typography.h4,
    color: C.text,
  },
  profileEmail: {
    ...Typography.bodySmall,
    color: C.textSecondary,
  },
  editProfileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Settings group
  settingsGroup: {
    backgroundColor: C.surface,
    borderRadius: Rounded.xl,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.outlineVariant,
    marginLeft: Spacing.base + 34 + Spacing.md,
  },
  // Sign out
  signOutWrapper: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
});
