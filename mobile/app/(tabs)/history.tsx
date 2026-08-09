import React from 'react';
import { StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function HistoryScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Journey History</ThemedText>
      <ThemedText style={styles.subtitle}>List of your optimized past trips and reports. (Faz 1 Skeleton)</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 15,
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
  },
});
