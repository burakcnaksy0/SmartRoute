import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Rounded } from '@/constants/theme';

export default function VehiclesScreen() {
  const colors = Colors.light;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" />
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: 'rgba(0,0,0,0.04)' }]}>
        <View style={styles.headerTitleRow}>
          <Text style={[styles.headerTitle, { color: colors.onSurface }]}>SmartRoute</Text>
        </View>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <MaterialIcons name="person" size={18} color={colors.onPrimary} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.mainTitle, { color: colors.onSurface }]}>Vehicles</Text>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Your Garage</Text>
          <TouchableOpacity style={[styles.addButton, { backgroundColor: 'rgba(42, 20, 180, 0.1)' }]}>
            <MaterialIcons name="add" size={18} color={colors.primary} />
            <Text style={[styles.addButtonText, { color: colors.primary }]}>Add Vehicle</Text>
          </TouchableOpacity>
        </View>

        {/* Tesla Model 3 Card */}
        <View style={[styles.vehicleCard, { backgroundColor: colors.surface }]}>
          {/* Accent decoration */}
          <View style={[styles.accentCircle, { backgroundColor: 'rgba(42, 20, 180, 0.04)' }]} />

          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.vehicleName, { color: colors.onSurface }]}>Tesla Model 3</Text>
              <Text style={[styles.vehicleSub, { color: colors.onSurfaceVariant }]}>Long Range Dual Motor</Text>
            </View>
            <View style={[styles.iconContainer, { backgroundColor: colors.secondaryContainer }]}>
              <MaterialIcons name="electric-car" size={22} color={colors.onSecondaryContainer} />
            </View>
          </View>

          <View style={styles.grid}>
            <View style={[styles.gridItem, { backgroundColor: colors.surfaceLow }]}>
              <Text style={[styles.gridLabel, { color: colors.onSurfaceVariant }]}>Battery Type</Text>
              <Text style={[styles.gridValue, { color: colors.onSurface }]}>Electric</Text>
            </View>
            <View style={[styles.gridItem, { backgroundColor: colors.surfaceLow }]}>
              <Text style={[styles.gridLabel, { color: colors.onSurfaceVariant }]}>Efficiency</Text>
              <Text style={[styles.gridValue, { color: colors.onSurface }]}>260 Wh/mi</Text>
            </View>
          </View>

          <View style={[styles.rangeBar, { backgroundColor: colors.surfaceLow }]}>
            <View style={styles.rangeInfo}>
              <MaterialIcons name="battery-charging-full" size={18} color={colors.primary} />
              <Text style={[styles.rangeText, { color: colors.primary }]}>Current Range: ~310 mi</Text>
            </View>
            <TouchableOpacity style={styles.editButton}>
              <MaterialIcons name="edit" size={18} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
        </View>

        {/* BMW X5 Card */}
        <View style={[styles.vehicleCard, { backgroundColor: colors.surface }]}>
          {/* Accent decoration */}
          <View style={[styles.accentCircle, { backgroundColor: 'rgba(85, 51, 0, 0.04)' }]} />

          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.vehicleName, { color: colors.onSurface }]}>BMW X5</Text>
              <Text style={[styles.vehicleSub, { color: colors.onSurfaceVariant }]}>xDrive40i</Text>
            </View>
            <View style={[styles.iconContainer, { backgroundColor: colors.surfaceContainerHigh }]}>
              <MaterialIcons name="directions-car" size={22} color={colors.onSurfaceVariant} />
            </View>
          </View>

          <View style={styles.grid}>
            <View style={[styles.gridItem, { backgroundColor: colors.surfaceLow }]}>
              <Text style={[styles.gridLabel, { color: colors.onSurfaceVariant }]}>Fuel Type</Text>
              <Text style={[styles.gridValue, { color: colors.onSurface }]}>Premium Gas</Text>
            </View>
            <View style={[styles.gridItem, { backgroundColor: colors.surfaceLow }]}>
              <Text style={[styles.gridLabel, { color: colors.onSurfaceVariant }]}>Efficiency</Text>
              <Text style={[styles.gridValue, { color: colors.onSurface }]}>23 MPG (Combined)</Text>
            </View>
          </View>

          <View style={[styles.rangeBar, { backgroundColor: colors.surfaceLow }]}>
            <View style={styles.rangeInfo}>
              <MaterialIcons name="local-gas-station" size={18} color={colors.tertiary} />
              <Text style={[styles.rangeText, { color: colors.tertiary }]}>Est. Range: ~450 mi</Text>
            </View>
            <TouchableOpacity style={styles.editButton}>
              <MaterialIcons name="edit" size={18} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
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
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.stackMd,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Rounded.full,
    gap: 4,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  vehicleCard: {
    borderRadius: Rounded.xl,
    padding: 16,
    marginBottom: Spacing.stackMd,
    overflow: 'hidden',
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 2,
  },
  accentCircle: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.stackMd,
  },
  vehicleName: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.4,
    marginBottom: 2,
  },
  vehicleSub: {
    fontSize: 15,
    fontFamily: 'System',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: Spacing.stackMd,
  },
  gridItem: {
    flex: 1,
    padding: 12,
    borderRadius: Rounded.md,
  },
  gridLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  gridValue: {
    fontSize: 17,
    fontWeight: '600',
  },
  rangeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Rounded.md,
  },
  rangeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rangeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  editButton: {
    padding: 4,
  },
});
