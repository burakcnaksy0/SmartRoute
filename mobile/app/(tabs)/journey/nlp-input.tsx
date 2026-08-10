import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useJourneyStore } from '@/store/journeyStore';
import { Colors, Spacing, Rounded, Shadow, Typography } from '@/constants/theme';
import { ScreenHeader } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/States';

const C = Colors.light;

const EXAMPLE_PROMPTS = [
  "Sabah 9'da evden çık, 10'da bankaya uğra, öğlen Maslak'ta toplantı yap, öğleden sonra 2'de markete git.",
  "Bu öğleden sonra Beşiktaş'tan başla, Gebze Center'a git, saat 18:00'e kadar varmam gerek.",
  "İşe giderken eczaneye uğrayıp ilacımı al, dönüşte kuru temizlemeye uğra.",
];

export default function NlpInputScreen() {
  const router = useRouter();
  const { parseNlp, isNlpParsing, nlpError, clearError } = useJourneyStore();

  const [text, setText] = useState('');
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const handleParse = async () => {
    if (!text.trim()) {
      Alert.alert('Giriş Boş', 'Lütfen seyahat rotanızı açıklayın.');
      return;
    }
    clearError();
    const success = await parseNlp(text.trim());
    if (success) {
      router.push('/(tabs)/journey/nlp-confirm' as any);
    }
  };

  const handleExamplePress = (example: string) => setText(example);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScreenHeader title="Yapay Zeka Asistanı" />

      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.container, { opacity: fadeAnim }]}>

            {/* Intro */}
            <View style={styles.intro}>
              <View style={styles.introIcon}>
                <MaterialIcons name="auto-awesome" size={32} color={C.primary} />
              </View>
              <Text style={styles.introTitle}>Gününüzü Anlatın</Text>
              <Text style={styles.introSub}>
                Yapay zekaya nereye ve ne zaman gitmek istediğinizi anlatın. Konumları, süreleri ve zaman kısıtlamalarını otomatik olarak analiz eder.
              </Text>
            </View>

            {/* Input */}
            <View
              style={[
                styles.inputCard,
                isFocused && styles.inputCardFocused,
              ]}
            >
              <TextInput
                style={styles.textInput}
                placeholder="Örn: Sabah 10'da Kadıköy'de toplantı, 15 dakika eczane ziyareti, öğleden sonra 3'te market..."
                placeholderTextColor={C.outline}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                value={text}
                onChangeText={setText}
                maxLength={500}
                editable={!isNlpParsing}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
              />
              <Text style={styles.charCount}>{text.length} / 500</Text>
            </View>

            {/* Error */}
            {nlpError && <ErrorBanner message={nlpError} />}

            {/* CTA */}
            <Button
              label={isNlpParsing ? 'Analiz ediliyor...' : 'Planı Çözümle'}
              icon={isNlpParsing ? undefined : 'auto-awesome'}
              onPress={handleParse}
              loading={isNlpParsing}
              disabled={!text.trim() || isNlpParsing}
              fullWidth
              size="lg"
            />

            {/* Examples divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Örnek şablonları deneyin</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Example prompts */}
            <View style={styles.examples}>
              {EXAMPLE_PROMPTS.map((example, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.exampleChip}
                  onPress={() => handleExamplePress(example)}
                  disabled={isNlpParsing}
                  activeOpacity={0.75}
                >
                  <MaterialIcons name="lightbulb-outline" size={14} color={C.primary} style={{ marginTop: 1 }} />
                  <Text style={styles.exampleText} numberOfLines={2}>
                    {example}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Manual link */}
            <TouchableOpacity
              style={styles.manualLink}
              onPress={() => router.push('/(tabs)/journey/new-stop' as any)}
            >
              <Text style={styles.manualLinkText}>
                Durakları elle mi eklemek istersiniz?{' '}
                <Text style={styles.manualLinkHighlight}>Planlayıcıyı Aç →</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.background,
  },
  root: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
  },
  container: {
    padding: Spacing.gutter,
    paddingTop: Spacing.xl,
    gap: Spacing.xl,
    paddingBottom: Spacing['3xl'],
  },
  // Intro
  intro: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  introIcon: {
    width: 68,
    height: 68,
    borderRadius: Rounded['2xl'],
    backgroundColor: C.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introTitle: {
    ...Typography.h2,
    color: C.text,
    textAlign: 'center',
  },
  introSub: {
    ...Typography.body,
    color: C.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.base,
  },
  // Input card
  inputCard: {
    backgroundColor: C.surface,
    borderRadius: Rounded.xl,
    padding: Spacing.base,
    borderWidth: 1.5,
    borderColor: C.outlineVariant,
    ...Shadow.sm,
  },
  inputCardFocused: {
    borderColor: C.primary,
    backgroundColor: C.surfaceContainerLowest,
  },
  textInput: {
    ...Typography.body,
    color: C.text,
    minHeight: 120,
    padding: 0,
    textAlignVertical: 'top',
  },
  charCount: {
    ...Typography.caption,
    color: C.outline,
    textAlign: 'right',
    marginTop: Spacing.sm,
  },
  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.outlineVariant,
  },
  dividerText: {
    ...Typography.caption,
    color: C.outline,
    fontWeight: '600',
  },
  // Examples
  examples: {
    gap: Spacing.sm,
  },
  exampleChip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: C.surface,
    borderRadius: Rounded.xl,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  exampleText: {
    ...Typography.bodySmall,
    color: C.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  // Manual link
  manualLink: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  manualLinkText: {
    ...Typography.bodySmall,
    color: C.textSecondary,
  },
  manualLinkHighlight: {
    color: C.primary,
    fontWeight: '600',
  },
});
