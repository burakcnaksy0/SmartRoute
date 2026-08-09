import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Login to SmartRoute</ThemedText>
      <ThemedText style={styles.subtitle}>Welcome back! This is a placeholder screen for Faz 1.</ThemedText>
      
      <TouchableOpacity 
        style={styles.button}
        onPress={() => router.replace('/(tabs)/journey')}
      >
        <ThemedText style={styles.buttonText}>Bypass Login (Go to App)</ThemedText>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.link}
        onPress={() => router.push('/(auth)/register')}
      >
        <ThemedText type="link">Don{"'"}t have an account? Register</ThemedText>
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
  link: {
    marginTop: 10,
  },
});
