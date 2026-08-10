import { Stack } from 'expo-router';

export default function JourneyLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="new-stop" />
      <Stack.Screen name="stop-detail" />
      <Stack.Screen name="plan-result" />
      <Stack.Screen name="nlp-input" />
      <Stack.Screen name="nlp-confirm" />
      <Stack.Screen name="departure-suggestions" />
      <Stack.Screen name="active-journey" />
    </Stack>
  );
}
