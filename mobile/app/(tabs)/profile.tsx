import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Switch,
  StatusBar,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Rounded } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/api/auth';

export default function ProfileScreen() {
  const colors = Colors.light;
  const { user, logout } = useAuthStore();

  // Settings states
  const [departureAlerts, setDepartureAlerts] = useState(true);
  const [serviceDisruptions, setServiceDisruptions] = useState(false);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      console.warn('Logout failed to call API, logging out locally', e);
    } finally {
      await logout();
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" />
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: 'rgba(0,0,0,0.04)' }]}>
        <View style={styles.headerTitleRow}>
          <Text style={[styles.headerTitle, { color: colors.onSurface }]}>SmartRoute</Text>
        </View>
        <View style={[styles.avatarHeader, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarHeaderText}>
            {user?.fullName ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase() : 'JD'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.mainTitle, { color: colors.onSurface }]}>Settings</Text>

        {/* Section: Account */}
        <Text style={[styles.sectionLabel, { color: colors.outline }]}>Account</Text>
        <View style={[styles.sectionContainer, { backgroundColor: colors.surface }]}>
          <TouchableOpacity style={styles.accountRow} activeOpacity={0.7}>
            <View style={styles.accountLeft}>
              <View style={[styles.accountAvatar, { backgroundColor: colors.primaryContainer }]}>
                <MaterialIcons name="person" size={24} color={colors.onPrimaryContainer} />
              </View>
              <View>
                <Text style={[styles.profileName, { color: colors.onSurface }]}>
                  {user?.fullName || 'Jane Doe'}
                </Text>
                <Text style={[styles.profileEmail, { color: colors.outline }]}>
                  {user?.email || 'jane.doe@example.com'}
                </Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.outline} />
          </TouchableOpacity>
        </View>

        {/* Section: Preferences */}
        <Text style={[styles.sectionLabel, { color: colors.outline }]}>Preferences</Text>
        <View style={[styles.sectionContainer, { backgroundColor: colors.surface }]}>
          <TouchableOpacity style={styles.preferenceRow} activeOpacity={0.7}>
            <View style={styles.prefLeft}>
              <View style={[styles.prefIconContainer, { backgroundColor: colors.surfaceContainer }]}>
                <MaterialIcons name="map" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.prefText, { color: colors.onSurface }]}>Map Provider</Text>
            </View>
            <View style={styles.prefRight}>
              <Text style={[styles.prefValue, { color: colors.outline }]}>Apple Maps</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.outline} />
            </View>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.surfaceContainer }]} />

          <TouchableOpacity style={styles.preferenceRow} activeOpacity={0.7}>
            <View style={styles.prefLeft}>
              <View style={[styles.prefIconContainer, { backgroundColor: colors.surfaceContainer }]}>
                <MaterialIcons name="straighten" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.prefText, { color: colors.onSurface }]}>Units</Text>
            </View>
            <View style={styles.prefRight}>
              <Text style={[styles.prefValue, { color: colors.outline }]}>Miles</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.outline} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Section: Notifications */}
        <Text style={[styles.sectionLabel, { color: colors.outline }]}>Notifications</Text>
        <View style={[styles.sectionContainer, { backgroundColor: colors.surface }]}>
          <View style={styles.notificationRow}>
            <View style={styles.prefLeft}>
              <View style={[styles.prefIconContainer, { backgroundColor: colors.surfaceContainer }]}>
                <MaterialIcons name="directions-bus" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.prefText, { color: colors.onSurface }]}>Departure Alerts</Text>
                <Text style={[styles.prefDesc, { color: colors.outline }]}>Notify when it's time to leave</Text>
              </View>
            </View>
            <Switch
              value={departureAlerts}
              onValueChange={setDepartureAlerts}
              trackColor={{ false: colors.surfaceContainerHigh, true: colors.primary }}
              thumbColor={Platform.OS === 'ios' ? undefined : '#FFFFFF'}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.surfaceContainer }]} />

          <View style={styles.notificationRow}>
            <View style={styles.prefLeft}>
              <View style={[styles.prefIconContainer, { backgroundColor: colors.surfaceContainer }]}>
                <MaterialIcons name="warning" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.prefText, { color: colors.onSurface }]}>Service Disruptions</Text>
                <Text style={[styles.prefDesc, { color: colors.outline }]}>Alerts for route delays</Text>
              </View>
            </View>
            <Switch
              value={serviceDisruptions}
              onValueChange={setServiceDisruptions}
              trackColor={{ false: colors.surfaceContainerHigh, true: colors.primary }}
              thumbColor={Platform.OS === 'ios' ? undefined : '#FFFFFF'}
            />
          </View>
        </View>

        {/* Sign Out Button */}
        <View style={styles.signOutWrapper}>
          <TouchableOpacity
            style={[styles.signOutButton, { backgroundColor: colors.surface }]}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Text style={[styles.signOutText, { color: colors.error }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    height: 56,
    paddingHorizontal: Spacing.marginMain,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'System',
    letterSpacing: -0.4,
  },
  avatarHeader: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHeaderText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: Spacing.marginMain,
    paddingTop: Spacing.stackLg,
    paddingBottom: 100, // Safe padding for bottom tabs
  },
  mainTitle: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.4,
    marginBottom: Spacing.stackLg,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 4,
    marginBottom: Spacing.stackSm,
    marginTop: Spacing.stackLg,
  },
  sectionContainer: {
    borderRadius: Rounded.xl,
    overflow: 'hidden',
    shadowColor: 'rgba(0, 0, 0, 0.02)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 1,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  accountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  accountAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.4,
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 15,
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  prefLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  prefIconContainer: {
    width: 32,
    height: 32,
    borderRadius: Rounded.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefText: {
    fontSize: 17,
    fontWeight: '500',
  },
  prefDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  prefRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  prefValue: {
    fontSize: 15,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  divider: {
    height: 1,
    marginLeft: 64,
  },
  signOutWrapper: {
    marginTop: Spacing.stackLg,
    marginBottom: Spacing.stackLg,
  },
  signOutButton: {
    borderRadius: Rounded.xl,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.02)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 1,
  },
  signOutText: {
    fontSize: 17,
    fontWeight: '600',
  },
});
