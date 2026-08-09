import { Tabs, useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { MaterialIcons } from '@expo/vector-icons';
import { View, Platform, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useJourneyStore } from '@/store/journeyStore';

export default function TabLayout() {
  const colors = Colors.light; // We strictly align with the light iOS design tokens
  const router = useRouter();
  const { currentJourney, completedStopIds } = useJourneyStore();

  const isActive = currentJourney && currentJourney.status === 'active';
  const stopsSorted = [...(currentJourney?.stops ?? [])].sort(
    (a, b) => (a.optimizedOrder ?? a.sequenceOrder) - (b.optimizedOrder ?? b.sequenceOrder)
  );
  const nextStop = stopsSorted.find(s => !completedStopIds.includes(s.id));

  return (
    <View style={{ flex: 1 }}>
      <Tabs screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.outline,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          fontFamily: 'System',
        },
        tabBarStyle: {
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          borderTopWidth: 1,
          borderTopColor: 'rgba(0, 0, 0, 0.04)',
          elevation: 0,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
        }
      }}>
        <Tabs.Screen 
          name="journey" 
          options={{ 
            title: 'Journey',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="explore" size={size || 24} color={color} />
            ),
          }} 
        />
        <Tabs.Screen 
          name="history" 
          options={{ 
            title: 'Activity',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="history" size={size || 24} color={color} />
            ),
          }} 
        />
        <Tabs.Screen 
          name="vehicles" 
          options={{ 
            title: 'Vehicles',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="directions-car" size={size || 24} color={color} />
            ),
          }} 
        />
        <Tabs.Screen 
          name="profile" 
          options={{ 
            title: 'Settings',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="settings" size={size || 24} color={color} />
            ),
          }} 
        />
      </Tabs>

      {isActive && nextStop && (
        <TouchableOpacity
          style={[styles.stripContainer, { bottom: Platform.OS === 'ios' ? 100 : 76 }]}
          onPress={() => router.push('/(tabs)/journey/active-journey' as any)}
          activeOpacity={0.9}
        >
          <View style={styles.stripContent}>
            <Text style={styles.stripIcon}>🧭</Text>
            <View style={styles.stripTextContainer}>
              <Text style={styles.stripTitle}>Aktif Yolculuk Devam Ediyor</Text>
              <Text style={styles.stripSubtitle} numberOfLines={1}>
                Sıradaki Durak: {nextStop.placeName}
              </Text>
            </View>
          </View>
          <Text style={styles.stripArrow}>➔</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stripContainer: {
    position: 'absolute',
    left: 12,
    right: 12,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#3B82F640',
  },
  stripContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  stripIcon: {
    fontSize: 20,
  },
  stripTextContainer: {
    flex: 1,
  },
  stripTitle: {
    color: '#3B82F6',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stripSubtitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  stripArrow: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

