import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';

export default function NewStopScreen() {
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Add New Stop</ThemedText>
      <ThemedText style={styles.subtitle}>Select a place and time window for your stop. (Faz 1 Skeleton)</ThemedText>

      <TouchableOpacity 
        style={styles.button}
        onPress={() => router.back()}
      >
        <ThemedText style={styles.buttonText}>Go Back</ThemedText>
      </TouchableOpacity>
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
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#0274DF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
