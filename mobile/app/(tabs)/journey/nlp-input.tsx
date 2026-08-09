import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useJourneyStore } from '@/store/journeyStore';
import { Colors, Spacing, Rounded } from '@/constants/theme';

const EXAMPLE_PROMPTS = [
  "Leave home at 9 AM, drop by the bank at 10 AM, meeting in Maslak at noon, stop by grocery store at 2 PM.",
  "Start from Beşiktaş this afternoon, go to Gebze Center, need to arrive by 6 PM.",
  "Stop by pharmacy to pick up medicine on my way to work, get dry cleaning on my way back."
];

export default function NlpInputScreen() {
  const router = useRouter();
  const colors = Colors.light;
  const { parseNlp, isNlpParsing, nlpError, clearError } = useJourneyStore();

  const [text, setText] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (isNlpParsing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(shimmerAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      shimmerAnim.stopAnimation();
      shimmerAnim.setValue(0);
    }
  }, [isNlpParsing]);

  const handleParse = async () => {
    if (!text.trim()) {
      Alert.alert('Empty Input', 'Please describe your journey route.');
      return;
    }
    clearError();
    const success = await parseNlp(text.trim());
    if (success) {
      router.push('/(tabs)/journey/nlp-confirm' as any);
    }
  };

  const handleExamplePress = (example: string) => {
    setText(example);
  };

  const handleManualEntry = () => {
    router.push('/(tabs)/journey/new-stop' as any);
  };

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 1],
  });

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
        <Text style={[styles.headerTitle, { color: colors.onSurface }]}>AI Assistant</Text>
        <View style={styles.headerBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
            
            {/* Title / Description */}
            <View style={styles.assistantIntro}>
              <View style={[styles.sparkIconContainer, { backgroundColor: colors.primaryFixed }]}>
                <MaterialIcons name="auto-awesome" size={28} color={colors.primary} />
              </View>
              <Text style={[styles.introTitle, { color: colors.onSurface }]}>Describe Your Day</Text>
              <Text style={[styles.introSub, { color: colors.outline }]}>
                Tell the assistant where you need to go and when. It will automatically detect coordinates, durations, and time constraints.
              </Text>
            </View>

            {/* Prompt input card */}
            <View style={[styles.inputCard, { backgroundColor: colors.surface }]}>
              <TextInput
                style={[styles.textInput, { color: colors.onSurface }]}
                placeholder="e.g., meeting in Kadıköy at 10 AM, pharmacy visit for 15 minutes, grocery store by 3 PM..."
                placeholderTextColor={colors.outline}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                value={text}
                onChangeText={setText}
                maxLength={500}
                editable={!isNlpParsing}
              />
              <Text style={[styles.charCount, { color: colors.outline }]}>{text.length}/500</Text>
            </View>

            {/* Parsing error notification */}
            {nlpError && (
              <View style={[styles.errorBox, { backgroundColor: colors.errorContainer + '15', borderColor: colors.error }]}>
                <MaterialIcons name="warning" size={18} color={colors.error} />
                <Text style={[styles.errorText, { color: colors.error }]}>{nlpError}</Text>
              </View>
            )}

            {/* Action parsing buttons */}
            {isNlpParsing ? (
              <Animated.View style={[styles.ctaBtn, { backgroundColor: colors.primary, opacity: shimmerOpacity }]}>
                <ActivityIndicator color={colors.onPrimary} size="small" />
                <Text style={[styles.ctaBtnText, { color: colors.onPrimary }]}>  Analyzing Prompt...</Text>
              </Animated.View>
            ) : (
              <TouchableOpacity
                style={[styles.ctaBtn, { backgroundColor: colors.primary }, !text.trim() && { backgroundColor: colors.surfaceContainerHigh }]}
                onPress={handleParse}
                disabled={!text.trim()}
                activeOpacity={0.8}
              >
                <Text style={[styles.ctaBtnText, { color: colors.onPrimary }, !text.trim() && { color: colors.outline }]}>
                  Generate Itinerary Draft
                </Text>
              </TouchableOpacity>
            )}

            {/* Prompt Examples Divider */}
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: colors.surfaceContainer }]} />
              <Text style={[styles.dividerText, { color: colors.outline }]}>Or try these examples</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.surfaceContainer }]} />
            </View>

            {/* Prompt Chips */}
            <View style={styles.examplesGrid}>
              {EXAMPLE_PROMPTS.map((example, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.exampleChip, { backgroundColor: colors.surface, borderColor: 'rgba(0, 0, 0, 0.04)' }]}
                  onPress={() => handleExamplePress(example)}
                  disabled={isNlpParsing}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="chat-bubble-outline" size={16} color={colors.primary} />
                  <Text style={[styles.exampleChipText, { color: colors.onSurfaceVariant }]} numberOfLines={2}>
                    {example}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Manual navigation switcher */}
            <TouchableOpacity style={styles.manualEntryBtn} onPress={handleManualEntry}>
              <Text style={[styles.manualText, { color: colors.outline }]}>
                Prefer manually adding stops?{' '}
                <Text style={{ color: colors.primary, fontWeight: '600' }}>Open Builder →</Text>
              </Text>
            </TouchableOpacity>

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Add styles

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
  root: {
    flex: 1,
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
  assistantIntro: {
    alignItems: 'center',
    gap: 12,
    marginTop: Spacing.stackSm,
  },
  sparkIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  introSub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  inputCard: {
    borderRadius: Rounded.xl,
    padding: 16,
    shadowColor: 'rgba(0, 0, 0, 0.02)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 1,
  },
  textInput: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: 120,
    padding: 0,
    textAlignVertical: 'top',
  },
  charCount: {
    marginTop: 8,
    fontSize: 12,
    textAlign: 'right',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: Rounded.xl,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  ctaBtn: {
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
  ctaBtnText: {
    fontSize: 17,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: Spacing.stackSm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '500',
  },
  examplesGrid: {
    gap: 10,
  },
  exampleChip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: Rounded.xl,
    borderWidth: 1,
    padding: 14,
    shadowColor: 'rgba(0, 0, 0, 0.01)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  exampleChipText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  manualEntryBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 40,
  },
  manualText: {
    fontSize: 14,
  },
});
