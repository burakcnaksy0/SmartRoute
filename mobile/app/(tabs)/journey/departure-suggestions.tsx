import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Platform,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useJourneyStore } from '@/store/journeyStore';
import { DepartureSuggestion } from '@/api/journey';
import { Colors, Spacing, Rounded } from '@/constants/theme';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return isoStr;
  }
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

function confidenceColor(confidence: number, colors: any): string {
  if (confidence >= 0.85) return colors.secondary; // Emerald green
  if (confidence >= 0.65) return colors.tertiary;  // Amber/Orange
  return colors.error; // Red
}

function confidenceLabel(confidence: number): string {
  if (confidence >= 0.85) return 'High Confidence';
  if (confidence >= 0.65) return 'Moderate Risk';
  return 'High Congestion';
}

function ConfidenceBar({ value }: { value: number }) {
  const colors = Colors.light;
  const animWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animWidth, {
      toValue: value,
      duration: 800,
      delay: 200,
      useNativeDriver: false,
    }).start();
  }, [value]);

  const color = confidenceColor(value, colors);
  const widthPercent = animWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[barStyles.track, { backgroundColor: colors.surfaceContainer }]}>
      <Animated.View style={[barStyles.fill, { width: widthPercent, backgroundColor: color }]} />
    </View>
  );
}

const barStyles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    flex: 1,
  },
  fill: { height: '100%', borderRadius: 3 },
});

// ─── Suggestion Card ─────────────────────────────────────────────────────────

function SuggestionCard({
  suggestion,
  rank,
  selected,
  onSelect,
}: {
  suggestion: DepartureSuggestion;
  rank: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const colors = Colors.light;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const color = confidenceColor(suggestion.arrivalConfidence, colors);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    onSelect();
  };

  const isBest = rank === 1;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.suggCard,
          { backgroundColor: colors.surface, borderColor: 'rgba(0, 0, 0, 0.04)' },
          selected && [styles.suggCardSelected, { borderColor: colors.primary }],
        ]}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        {isBest && (
          <View style={[styles.bestBadge, { backgroundColor: colors.secondaryContainer }]}>
            <MaterialIcons name="star" size={14} color={colors.onSecondaryContainer} />
            <Text style={[styles.bestBadgeText, { color: colors.onSecondaryContainer }]}>Recommended</Text>
          </View>
        )}

        <View style={styles.suggTop}>
          <View>
            <Text style={[styles.suggTime, { color: colors.onSurface }]}>
              {formatTime(suggestion.departureTime)}
            </Text>
            <Text style={[styles.suggDur, { color: colors.outline }]}>
              {formatDuration(suggestion.estimatedDurationSeconds)} transit duration
            </Text>
          </View>
          <View style={styles.confidenceBlock}>
            <Text style={[styles.confidencePct, { color }]}>
              {Math.round(suggestion.arrivalConfidence * 100)}%
            </Text>
            <Text style={[styles.confidenceLabelText, { color }]}>
              {confidenceLabel(suggestion.arrivalConfidence)}
            </Text>
          </View>
        </View>

        <View style={styles.barRow}>
          <ConfidenceBar value={suggestion.arrivalConfidence} />
        </View>

        {selected && (
          <View style={[styles.selectedCheck, { backgroundColor: colors.primary }]}>
            <MaterialIcons name="done" size={14} color={colors.onPrimary} />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function DepartureSuggestionsScreen() {
  const router = useRouter();
  const colors = Colors.light;
  const { journeyId } = useLocalSearchParams<{ journeyId: string }>();
  const { currentJourney, departureSuggestions, isLoadingSuggestions, suggestionsError, fetchDepartureSuggestions } =
    useJourneyStore();

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [targetTime, setTargetTime] = useState<string>('');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const effectiveJourneyId = journeyId ?? currentJourney?.id;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  // Set default target arrival time: 2 hours from now
  useEffect(() => {
    const d = new Date();
    d.setHours(d.getHours() + 2);
    setTargetTime(d.toISOString().replace('Z', '').split('.')[0]);
  }, []);

  const handleFetch = async () => {
    if (!effectiveJourneyId) {
      Alert.alert('Error', 'No journey active.');
      return;
    }
    setSelectedIdx(null);
    await fetchDepartureSuggestions(effectiveJourneyId, targetTime);
  };

  useEffect(() => {
    if (effectiveJourneyId && targetTime) {
      handleFetch();
    }
  }, [effectiveJourneyId, targetTime]);

  const sorted = departureSuggestions
    ? [...departureSuggestions].sort((a, b) => b.arrivalConfidence - a.arrivalConfidence)
    : null;

  const handleRemindMe = async () => {
    if (selectedIdx == null || !sorted) return;
    const suggestion = sorted[selectedIdx];

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      Alert.alert(
        'Permissions Needed',
        'Notification permission is required to schedule local reminders.',
        [{ text: 'OK' }]
      );
      return;
    }

    const depDate = new Date(suggestion.departureTime);
    const remindAt = new Date(depDate.getTime() - 10 * 60 * 1000); // 10 min prior

    if (remindAt <= new Date()) {
      Alert.alert('Immediate Departure', 'This departure window is in less than 10 minutes.');
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🚗 Time to Leave!',
        body: `You should start your journey at ${formatTime(suggestion.departureTime)} to avoid traffic.`,
        sound: true,
      },
      trigger: { date: remindAt } as any,
    });

    Alert.alert(
      'Reminder Configured ✅',
      `A reminder has been scheduled for ${formatTime(suggestion.departureTime)}.\n(You will receive a notification 10 minutes prior)`
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" />
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: 'rgba(0,0,0,0.04)' }]}>
        <TouchableOpacity 
          style={styles.headerBtn} 
          onPress={() => router.back()}
          accessibilityLabel="Back"
        >
          <MaterialIcons name="chevron-left" size={28} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.onSurface }]}>Departure Advisor</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
          
          <View style={styles.introBlock}>
            <View style={[styles.clockIconBg, { backgroundColor: colors.primaryFixed }]}>
              <MaterialIcons name="schedule" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.introTitle, { color: colors.onSurface }]}>Smart Departure Recommendation</Text>
            <Text style={[styles.introSub, { color: colors.outline }]}>
              Compare traffic models across different departure intervals to maximize arrival probability.
            </Text>
          </View>

          {/* Target details */}
          <View style={[styles.targetCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.targetLabel, { color: colors.outline }]}>Target Arrival Time</Text>
            <Text style={[styles.targetTime, { color: colors.onSurface }]}>{formatTime(targetTime)}</Text>
          </View>

          {/* Loading models */}
          {isLoadingSuggestions && (
            <View style={styles.loadingBlock}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={[styles.loadingText, { color: colors.onSurface }]}>Predicting traffic congestion patterns...</Text>
              <Text style={[styles.loadingSubText, { color: colors.outline }]}>Best Guess • Optimistic • Pessimistic Models</Text>
            </View>
          )}

          {/* Errors */}
          {suggestionsError && !isLoadingSuggestions && (
            <View style={[styles.errorBanner, { backgroundColor: colors.errorContainer + '15', borderColor: colors.error }]}>
              <MaterialIcons name="warning" size={18} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>{suggestionsError}</Text>
              <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.error }]} onPress={handleFetch}>
                <Text style={styles.retryBtnText}>Retry Prediction</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Suggestions List */}
          {sorted && !isLoadingSuggestions && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.outline }]}>
                {sorted.length} Alternatives Evaluated
              </Text>
              {sorted.map((s, i) => (
                <SuggestionCard
                  key={i}
                  suggestion={s}
                  rank={i + 1}
                  selected={selectedIdx === i}
                  onSelect={() => setSelectedIdx(i)}
                />
              ))}
            </>
          )}

          {/* Actions */}
          {sorted && !isLoadingSuggestions && (
            <View style={styles.actions}>
              <TouchableOpacity
                style={[
                  styles.remindBtn, 
                  { backgroundColor: colors.primary },
                  selectedIdx == null && { backgroundColor: colors.surfaceContainerHigh }
                ]}
                onPress={handleRemindMe}
                disabled={selectedIdx == null}
                activeOpacity={0.8}
              >
                <MaterialIcons name="notifications-active" size={20} color={selectedIdx == null ? colors.outline : colors.onPrimary} />
                <Text style={[
                  styles.remindBtnText, 
                  { color: colors.onPrimary },
                  selectedIdx == null && { color: colors.outline }
                ]}>
                  Set Alarm Notification
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryBtn, { borderColor: colors.outlineVariant }]}
                onPress={() => router.back()}
              >
                <Text style={[styles.secondaryBtnText, { color: colors.onSurfaceVariant }]}>Go Back</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  scroll: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: Spacing.marginMain,
    paddingTop: Spacing.stackLg,
    gap: Spacing.stackLg,
  },
  introBlock: {
    alignItems: 'center',
    gap: 12,
    marginTop: Spacing.stackSm,
  },
  clockIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.4,
    paddingHorizontal: 8,
  },
  introSub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  targetCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: Rounded.xl,
    padding: 16,
    shadowColor: 'rgba(0, 0, 0, 0.02)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 1,
  },
  targetLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  targetTime: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  loadingBlock: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 32,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
  },
  loadingSubText: {
    fontSize: 12,
  },
  errorBanner: {
    borderRadius: Rounded.xl,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  errorText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
  },
  retryBtn: {
    borderRadius: Rounded.lg,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 4,
    marginTop: Spacing.stackSm,
  },
  suggCard: {
    borderRadius: Rounded.xl,
    borderWidth: 1.5,
    padding: 16,
    gap: 12,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: 'rgba(0, 0, 0, 0.02)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 1,
  },
  suggCardSelected: {
    borderWidth: 2,
  },
  bestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    borderRadius: Rounded.full,
    paddingVertical: 3,
    paddingHorizontal: 10,
    marginBottom: 2,
  },
  bestBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  suggTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  suggTime: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1,
  },
  suggDur: {
    fontSize: 12,
    marginTop: 2,
  },
  confidenceBlock: {
    alignItems: 'flex-end',
  },
  confidencePct: {
    fontSize: 22,
    fontWeight: '800',
  },
  confidenceLabelText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  selectedCheck: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    gap: 12,
    marginTop: Spacing.stackSm,
    marginBottom: 40,
  },
  remindBtn: {
    height: 56,
    borderRadius: Rounded.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: 'rgba(42, 20, 180, 0.25)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  remindBtnText: {
    fontSize: 17,
    fontWeight: '600',
  },
  secondaryBtn: {
    height: 56,
    borderRadius: Rounded.xl,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 17,
    fontWeight: '600',
  },
});
