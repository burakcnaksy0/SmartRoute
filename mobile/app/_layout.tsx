import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useSegments, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { ActivityIndicator, View } from 'react-native';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '@/store/authStore';
// import Mapbox from '@rnmapbox/maps';

import { AnimatedSplashOverlay } from '@/components/animated-icon';

// Mapbox.setAccessToken('your_mapbox_token_here');
// Mapbox.setTelemetryEnabled(false);

SplashScreen.preventAutoHideAsync();

function NavigationLayout() {
  const segments = useSegments();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = (segments[0] as string) === '(auth)';

    if (!isAuthenticated && !inAuthGroup && (segments[0] as string) !== 'index') {
      // Redirect to login if not authenticated and trying to access app screens
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect to main app if authenticated and trying to access auth screens
      router.replace('/(tabs)/journey');
    }
  }, [isAuthenticated, isLoading, segments, router]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F6FA' }}>
        <ActivityIndicator size="large" color="#3B35D0" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

export default function RootLayout() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={DefaultTheme}>
        <AnimatedSplashOverlay />
        <NavigationLayout />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
