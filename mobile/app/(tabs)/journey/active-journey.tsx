import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Linking,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useJourneyStore } from '@/store/journeyStore';
import { Colors, Spacing, Rounded } from '@/constants/theme';

export default function ActiveJourneyScreen() {
  const router = useRouter();
  const colors = Colors.light;
  const {
    currentJourney,
    completedStopIds,
    replanSuggested,
    replanMessage,
    proposedPlan,
    isReplanLoading,
    markStopAsCompleted,
    triggerReplan,
    confirmReplan,
    cancelReplan,
  } = useJourneyStore();

  const [gpsMode, setGpsMode] = useState<'normal' | 'weak'>('normal');

  // Sort stops based on optimizedOrder or original sequence
  const stopsSorted = [...(currentJourney?.stops ?? [])].sort(
    (a, b) => (a.optimizedOrder ?? a.sequenceOrder) - (b.optimizedOrder ?? b.sequenceOrder)
  );

  // Find the next uncompleted stop
  const currentStop = stopsSorted.find(s => !completedStopIds.includes(s.id));

  // Determine current simulated coordinates based on progress and GPS mode
  const getSimulatedCoordinates = () => {
    if (!currentJourney) return { lat: 41.01, lng: 28.97 };

    let lat = currentJourney.startLat;
    let lng = currentJourney.startLng;

    if (completedStopIds.length > 0) {
      const lastCompletedId = completedStopIds[completedStopIds.length - 1];
      const lastStop = currentJourney.stops.find(s => s.id === lastCompletedId);
      if (lastStop) {
        if (gpsMode === 'normal') {
          if (currentStop) {
            lat = lastStop.lat + (currentStop.lat - lastStop.lat) * 0.1;
            lng = lastStop.lng + (currentStop.lng - lastStop.lng) * 0.1;
          } else {
            lat = lastStop.lat;
            lng = lastStop.lng;
          }
        } else {
          lat = lastStop.lat;
          lng = lastStop.lng;
        }
      }
    } else {
      if (currentStop && gpsMode === 'normal') {
        lat = currentJourney.startLat + (currentStop.lat - currentJourney.startLat) * 0.1;
        lng = currentJourney.startLng + (currentStop.lng - currentJourney.startLng) * 0.1;
      }
    }

    return { lat, lng };
  };

  const handleOpenNavigation = () => {
    if (!currentStop) return;
    const url = Platform.OS === 'ios'
      ? `maps://?q=${currentStop.lat},${currentStop.lng}`
      : `geo:${currentStop.lat},${currentStop.lng}?q=${currentStop.lat},${currentStop.lng}`;
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Unable to open maps application.');
      }
    });
  };

  const handleArrived = () => {
    if (!currentStop) return;
    markStopAsCompleted(currentStop.id);
  };

  const handleSimulateTrafficChange = async () => {
    const { lat, lng } = getSimulatedCoordinates();
    const suggested = await triggerReplan(lat, lng);
    if (!suggested) {
      Alert.alert('Route Status', 'No significant congestion changes detected on your route.');
    }
  };

  const handleConfirmReplan = async () => {
    const { lat, lng } = getSimulatedCoordinates();
    const success = await confirmReplan(lat, lng);
    if (success) {
      Alert.alert('Success', 'Your navigation itinerary has been updated!');
    }
  };

  const isStopCritical = currentStop?.priority === 'critical';

  if (!currentJourney || currentJourney.status === 'completed') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }, styles.centered]}>
        <MaterialIcons name="emoji-events" size={64} color={colors.secondary} />
        <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>Journey Completed!</Text>
        <Text style={[styles.emptyDesc, { color: colors.outline }]}>
          Great job! You have reached all stops in your optimized itinerary.
        </Text>
        <TouchableOpacity 
          style={[styles.emptyBtn, { backgroundColor: colors.primary }]} 
          onPress={() => router.replace('/(tabs)/journey')}
        >
          <Text style={[styles.emptyBtnText, { color: colors.onPrimary }]}>Back to Dashboard</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" />
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: 'rgba(0,0,0,0.04)' }]}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)/journey')} style={styles.closeBtn}>
          <Text style={[styles.closeBtnText, { color: colors.outline }]}>Close</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.onSurface }]}>Active Journey</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Next Stop Card */}
        {currentStop ? (
          <View 
            style={[
              styles.currentCard, 
              { backgroundColor: colors.surface, borderColor: 'rgba(0, 0, 0, 0.04)' },
              isStopCritical && [styles.criticalCard, { borderColor: colors.error }]
            ]}
          >
            <View style={styles.currentHeader}>
              <View style={styles.badgeRow}>
                <MaterialIcons 
                  name={isStopCritical ? 'warning' : 'navigation'} 
                  size={14} 
                  color={isStopCritical ? colors.error : colors.primary} 
                />
                <Text style={[styles.currentSub, { color: colors.outline }, isStopCritical && { color: colors.error }]}>
                  {isStopCritical ? 'NEXT CRITICAL STOP' : 'NEXT DESTINATION'}
                </Text>
              </View>
              {isStopCritical && (
                <View style={[styles.criticalBadge, { backgroundColor: colors.errorContainer }]}>
                  <Text style={[styles.criticalBadgeText, { color: colors.error }]}>CRITICAL</Text>
                </View>
              )}
            </View>
            
            <Text style={[styles.currentName, { color: colors.onSurface }]} numberOfLines={2}>
              {currentStop.placeName}
            </Text>
            
            {currentStop.timeWindowEnd && (
              <View style={styles.timeWindowRow}>
                <MaterialIcons name="schedule" size={14} color={isStopCritical ? colors.error : colors.outline} />
                <Text style={[styles.timeWarning, { color: colors.outline }, isStopCritical && { color: colors.error, fontWeight: '600' }]}>
                  Target Window: Before {new Date(currentStop.timeWindowEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            )}

            <View style={styles.actionRow}>
              <TouchableOpacity 
                style={[styles.navBtn, { backgroundColor: colors.surfaceLow }]} 
                onPress={handleOpenNavigation} 
                activeOpacity={0.8}
              >
                <MaterialIcons name="explore" size={18} color={colors.primary} />
                <Text style={[styles.navBtnText, { color: colors.primary }]}>Navigate</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.arrivedBtn, { backgroundColor: colors.secondary }]} 
                onPress={handleArrived} 
                activeOpacity={0.85}
              >
                <MaterialIcons name="done" size={18} color={colors.onSecondary} />
                <Text style={[styles.arrivedBtnText, { color: colors.onSecondary }]}>Arrived</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={[styles.currentCard, { backgroundColor: colors.surface, borderColor: 'rgba(0, 0, 0, 0.04)' }]}>
            <Text style={[styles.currentName, { color: colors.onSurface }]}>All stops successfully completed!</Text>
          </View>
        )}

        {/* Simulation Sandbox Control Box */}
        <View style={[styles.simPanel, { backgroundColor: colors.surfaceLow, borderColor: colors.outlineVariant }]}>
          <View style={styles.simHeader}>
            <MaterialIcons name="tune" size={18} color={colors.tertiary} />
            <Text style={[styles.simTitle, { color: colors.tertiary }]}>Route Simulation Toolkit</Text>
          </View>
          <Text style={[styles.simDesc, { color: colors.outline }]}>
            Test platform features under weak GPS signals or sudden live traffic congestion.
          </Text>

          {/* GPS Signal Switcher */}
          <View style={styles.simToggleRow}>
            <Text style={[styles.simLabel, { color: colors.onSurface }]}>GPS Status</Text>
            <View style={styles.toggleGroup}>
              <TouchableOpacity
                style={[styles.toggleBtn, gpsMode === 'normal' && [styles.toggleBtnActive, { backgroundColor: colors.surface }]]}
                onPress={() => setGpsMode('normal')}
              >
                <Text style={[styles.toggleText, { color: colors.outline }, gpsMode === 'normal' && { color: colors.secondary, fontWeight: '600' }]}>
                  Normal
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, gpsMode === 'weak' && [styles.toggleBtnActive, { backgroundColor: colors.surface }]]}
                onPress={() => setGpsMode('weak')}
              >
                <Text style={[styles.toggleText, { color: colors.outline }, gpsMode === 'weak' && { color: colors.error, fontWeight: '600' }]}>
                  Weak (LKL)
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Trigger Replan trigger */}
          <TouchableOpacity
            style={[styles.simTriggerBtn, { backgroundColor: colors.primary }]}
            onPress={handleSimulateTrafficChange}
            disabled={isReplanLoading}
          >
            {isReplanLoading ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <View style={styles.simBtnRow}>
                <MaterialIcons name="auto-awesome" size={16} color={colors.onPrimary} />
                <Text style={[styles.simTriggerText, { color: colors.onPrimary }]}>
                  Analyze Live Route Congestion
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* TimelineStepper */}
        <Text style={[styles.sectionTitle, { color: colors.outline }]}>Itinerary Progress</Text>
        <View style={styles.timeline}>
          {stopsSorted.map((stop, idx) => {
            const isCompleted = completedStopIds.includes(stop.id);
            const isCurrent = currentStop?.id === stop.id;
            const isLast = idx === stopsSorted.length - 1;

            return (
              <View key={stop.id} style={styles.timelineItem}>
                {/* Line & Icon */}
                <View style={styles.indicatorColumn}>
                  <View
                    style={[
                      styles.timelineDot,
                      { backgroundColor: colors.surfaceContainerHigh },
                      isCompleted && [styles.dotCompleted, { backgroundColor: colors.secondary }],
                      isCurrent && [styles.dotCurrent, { borderColor: colors.primary, backgroundColor: colors.surface }],
                    ]}
                  >
                    {isCompleted && <MaterialIcons name="done" size={12} color={colors.onSecondary} />}
                  </View>
                  {!isLast && (
                    <View style={[styles.timelineLine, { backgroundColor: colors.surfaceContainer }, isCompleted && { backgroundColor: colors.secondary }]} />
                  )}
                </View>

                {/* Details */}
                <View style={styles.detailsColumn}>
                  <Text
                    style={[
                      styles.stopPlace,
                      { color: colors.outline },
                      isCompleted && styles.stopCompletedText,
                      isCurrent && [styles.stopCurrentText, { color: colors.onSurface }],
                    ]}
                  >
                    {stop.placeName}
                  </Text>
                  <Text style={[styles.stopMeta, { color: colors.outline }]}>
                    {isCompleted
                      ? 'Completed'
                      : stop.priority === 'critical'
                      ? '⚠️ Critical Stop • ' + stop.visitDurationMinutes + ' min visit'
                      : 'Next stop • ' + stop.visitDurationMinutes + ' min visit'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Traffic Replanning Alert Bottom Sheet Overlay */}
      {replanSuggested && (
        <View style={styles.overlayBg}>
          <View style={[styles.replanPanel, { backgroundColor: colors.surface }]}>
            <View style={styles.replanHeader}>
              <View style={[styles.replanIconContainer, { backgroundColor: colors.errorContainer }]}>
                <MaterialIcons name="traffic" size={24} color={colors.error} />
              </View>
              <View style={styles.replanHeaderContent}>
                <Text style={[styles.replanTitle, { color: colors.onSurface }]}>Route Congestion Alert</Text>
                <Text style={[styles.replanSubtitle, { color: colors.error }]}>Traffic Change Detected</Text>
              </View>
            </View>

            <Text style={[styles.replanMessage, { color: colors.onSurfaceVariant }]}>{replanMessage}</Text>

            {proposedPlan && (
              <View style={[styles.replanMetrics, { backgroundColor: colors.surfaceLow }]}>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricLabel, { color: colors.outline }]}>New Total Duration</Text>
                  <Text style={[styles.metricValue, { color: colors.onSurface }]}>
                    {Math.floor(proposedPlan.totalDurationSeconds / 60)} min
                  </Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricLabel, { color: colors.outline }]}>Est. Toll/Fuel Cost</Text>
                  <Text style={[styles.metricValue, { color: colors.secondary }]}>
                    ${(proposedPlan.totalFuelCostEstimate ?? 0).toFixed(2)}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.replanActionRow}>
              <TouchableOpacity style={[styles.declineBtn, { backgroundColor: colors.surfaceContainerHigh }]} onPress={cancelReplan}>
                <Text style={[styles.declineBtnText, { color: colors.onSurfaceVariant }]}>Keep Current Route</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtnBtn, { backgroundColor: colors.primary }]} onPress={handleConfirmReplan}>
                <Text style={[styles.confirmBtnText, { color: colors.onPrimary }]}>Apply Optimized Route</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  closeBtn: {
    width: 60,
    height: 44,
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  scroll: {
    padding: Spacing.marginMain,
    gap: Spacing.stackLg,
    paddingBottom: 100,
  },
  currentCard: {
    borderRadius: Rounded.xl,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    shadowColor: 'rgba(0, 0, 0, 0.02)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 1,
  },
  criticalCard: {
    borderWidth: 1.5,
  },
  currentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  currentSub: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  criticalBadge: {
    borderRadius: Rounded.md,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  criticalBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  currentName: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  timeWindowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeWarning: {
    fontSize: 13,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  navBtn: {
    flex: 1,
    height: 48,
    borderRadius: Rounded.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  navBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  arrivedBtn: {
    flex: 1,
    height: 48,
    borderRadius: Rounded.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: 'rgba(16, 185, 129, 0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  arrivedBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  simPanel: {
    borderRadius: Rounded.xl,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  simHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  simTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  simDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  simToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  simLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  toggleGroup: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: Rounded.lg,
    padding: 2,
  },
  toggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Rounded.md,
  },
  toggleBtnActive: {
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  toggleText: {
    fontSize: 11,
    fontWeight: '600',
  },
  simTriggerBtn: {
    height: 44,
    borderRadius: Rounded.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  simBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  simTriggerText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 4,
    marginTop: Spacing.stackSm,
  },
  timeline: {
    paddingLeft: 10,
    gap: 2,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 16,
  },
  indicatorColumn: {
    alignItems: 'center',
    width: 24,
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    marginTop: 6,
  },
  dotCompleted: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginTop: 4,
  },
  dotCurrent: {
    borderWidth: 2,
  },
  timelineLine: {
    position: 'absolute',
    top: 18,
    bottom: -18,
    width: 2,
    zIndex: 1,
  },
  detailsColumn: {
    flex: 1,
    paddingBottom: 24,
  },
  stopPlace: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  stopCompletedText: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  stopCurrentText: {
    fontWeight: '700',
  },
  stopMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  emptyBtn: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: Rounded.xl,
    marginTop: 12,
  },
  emptyBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
    zIndex: 10,
  },
  replanPanel: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 16,
    borderTopWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 24,
  },
  replanHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  replanIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replanHeaderContent: {
    flex: 1,
  },
  replanTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  replanSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  replanMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  replanMetrics: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: Rounded.xl,
  },
  metricItem: {
    flex: 1,
    gap: 4,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  replanActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  declineBtn: {
    flex: 1,
    height: 50,
    borderRadius: Rounded.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  confirmBtnBtn: {
    flex: 1,
    height: 50,
    borderRadius: Rounded.xl,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(42, 20, 180, 0.25)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
