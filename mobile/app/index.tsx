import React from 'react';
import { StyleSheet, TouchableOpacity, View, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        
        {/* Top Spacer */}
        <View style={styles.spacer} />

        {/* Brand Header */}
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <ThemedText style={styles.logoText}>SR</ThemedText>
          </View>
          <ThemedText type="title" style={styles.title}>
            SmartRoute
          </ThemedText>
          <ThemedText style={styles.tagline}>
            Multi-stop Journey Optimizer
          </ThemedText>
        </View>

        {/* Hello SmartRoute Premium Card */}
        <View style={styles.glassCard}>
          <ThemedText type="subtitle" style={styles.helloText}>
            Hello SmartRoute
          </ThemedText>
          <ThemedText style={styles.description}>
            Your local development skeleton is fully operational. Scan the QR code to verify this live screen on your iPhone!
          </ThemedText>
        </View>

        {/* Bottom Spacer */}
        <View style={styles.spacer} />

        {/* Navigation Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => router.push('/(tabs)/journey')}
          >
            <ThemedText style={styles.primaryButtonText}>Go to App Dashboard</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <ThemedText style={styles.secondaryButtonText}>Giriş Yap / Üye Ol</ThemedText>
          </TouchableOpacity>
        </View>

        <ThemedText style={styles.footerText}>
          SmartRoute MVP • Faz 1 Proje İskeleti
        </ThemedText>

      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // Deep slate space background
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  spacer: {
    flex: 1,
  },
  brandContainer: {
    alignItems: 'center',
    gap: 8,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#2563EB', // Vibrant Blue
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
    marginBottom: 12,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  tagline: {
    color: '#94A3B8',
    fontSize: 15,
    fontWeight: '500',
  },
  glassCard: {
    width: width - 48,
    padding: 24,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    marginTop: 40,
    alignItems: 'center',
    gap: 12,
  },
  helloText: {
    color: '#38BDF8', // Cyan sky color
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    opacity: 0.9,
  },
  actionContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#F1F5F9',
    fontSize: 16,
    fontWeight: '600',
  },
  footerText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '400',
    marginBottom: 8,
  },
});
