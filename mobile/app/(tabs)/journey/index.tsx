import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';

export default function JourneyIndexScreen() {
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Journey Builder</ThemedText>
      <ThemedText style={styles.subtitle}>Plan your stops and optimize your routes here. (Faz 1 Skeleton)</ThemedText>

      <TouchableOpacity 
        style={styles.button}
        onPress={() => router.push('/(tabs)/journey/new-stop')}
      >
        <ThemedText style={styles.buttonText}>Add a New Stop</ThemedText>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.buttonSecondary}
        onPress={() => router.push('/(tabs)/journey/plan-result')}
      >
        <ThemedText style={styles.buttonTextSecondary}>View Plan Results</ThemedText>
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
  buttonSecondary: {
    borderWidth: 1,
    borderColor: '#0274DF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  buttonTextSecondary: {
    color: '#0274DF',
    fontWeight: 'bold',
  },
});
