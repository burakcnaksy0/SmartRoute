import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';

export default function TabLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.text,
      tabBarInactiveTintColor: '#888888',
      tabBarStyle: {
        backgroundColor: colors.background,
      }
    }}>
      <Tabs.Screen 
        name="journey" 
        options={{ 
          title: 'Journey',
        }} 
      />
      <Tabs.Screen 
        name="history" 
        options={{ 
          title: 'History',
        }} 
      />
      <Tabs.Screen 
        name="profile" 
        options={{ 
          title: 'Profile',
        }} 
      />
    </Tabs>
  );
}
