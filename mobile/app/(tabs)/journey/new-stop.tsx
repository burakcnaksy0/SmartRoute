import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Platform,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useJourneyStore } from '@/store/journeyStore';
import StopList, { StopListItem } from '@/components/StopList';
import { Colors, Spacing, Rounded } from '@/constants/theme';

const PREDEFINED_PLACES = [
  { name: 'Kadıköy, İstanbul', lat: 40.9909, lng: 29.0303 },
  { name: 'Beşiktaş, İstanbul', lat: 41.0428, lng: 29.0075 },
  { name: 'Üsküdar, İstanbul', lat: 41.0267, lng: 29.0156 },
  { name: 'Gebze Center, Kocaeli', lat: 40.7989, lng: 29.4123 },
  { name: 'Sabiha Gökçen Havalimanı', lat: 40.8986, lng: 29.3092 },
  { name: 'Maltepe Park, İstanbul', lat: 40.9167, lng: 29.1833 },
  { name: 'Maslak, İstanbul', lat: 41.1111, lng: 29.0194 },
];

export default function NewStopScreen() {
  const router = useRouter();
  const colors = Colors.light;
  
  const {
    draftStops,
    deleteDraftStop,
    reorderDraftStops,
    clearDraftStops,
    createJourney,
    optimizeJourney,
    isLoading,
    error,
  } = useJourneyStore();

  // Local starting parameters
  const [startAddress, setStartAddress] = useState('Kadıköy, İstanbul');
  const [startLat, setStartLat] = useState(40.9909);
  const [startLng, setStartLng] = useState(29.0303);

  useEffect(() => {
    const matched = PREDEFINED_PLACES.find(
      p => p.name.toLowerCase() === startAddress.toLowerCase() ||
           p.name.split(',')[0].toLowerCase() === startAddress.toLowerCase()
    );
    if (matched) {
      setStartLat(matched.lat);
      setStartLng(matched.lng);
    }
  }, [startAddress]);

  const [depTime, setDepTime] = useState('09:00');
  const [returnToStart, setReturnToStart] = useState(false);
  const [profileType, setProfileType] = useState<'fast' | 'economic'>('fast');

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [customPlaceName, setCustomPlaceName] = useState('');

  // Filtering searches
  const filteredPlaces = PREDEFINED_PLACES.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectPlace = (place: typeof PREDEFINED_PLACES[0]) => {
    setShowSearchResults(false);
    setSearchQuery('');
    router.push({
      pathname: '/(tabs)/journey/stop-detail' as any,
      params: {
        placeName: place.name,
        lat: String(place.lat),
        lng: String(place.lng),
      },
    });
  };

  const handleAddCustomPlace = () => {
    if (!customPlaceName.trim()) return;
    const mockLat = 40.9 + Math.random() * 0.2;
    const mockLng = 29.0 + Math.random() * 0.3;

    setCustomPlaceName('');
    router.push({
      pathname: '/(tabs)/journey/stop-detail' as any,
      params: {
        placeName: customPlaceName.trim(),
        lat: String(mockLat),
        lng: String(mockLng),
      },
    });
  };

  const handleBuildJourney = async () => {
    if (draftStops.length === 0) {
      Alert.alert('Error', 'Please add at least one stop to build your journey.');
      return;
    }

    const today = new Date();
    const [h, m] = depTime.split(':').map(Number);
    today.setHours(h || 9, m || 0, 0, 0);
    const plannedDepartureTime = today.toISOString().slice(0, 19);

    const requestBody = {
      startLat,
      startLng,
      startAddressText: startAddress,
      plannedDepartureTime,
      stops: draftStops,
    };

    const journey = await createJourney(requestBody);
    if (journey) {
      const success = await optimizeJourney(journey.id, {
        returnToStart,
        preferences: {
          profileType,
          avoidTolls: false,
          avoidHighways: false,
        },
      });

      if (success) {
        clearDraftStops();
        router.replace('/(tabs)/journey/plan-result' as any);
      }
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" />
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: 'rgba(0,0,0,0.04)' }]}>
        <TouchableOpacity 
          style={styles.headerBtn} 
          onPress={() => router.back()}
          accessibilityLabel="Back"
        >
          <MaterialIcons name="chevron-left" size={28} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.onSurface }]}>Manual Builder</Text>
        <TouchableOpacity 
          style={[styles.headerBtn, { alignItems: 'flex-end' }]} 
          onPress={() => clearDraftStops()}
        >
          <Text style={[styles.clearBtnText, { color: colors.error }]}>Reset</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scroll} 
        keyboardShouldPersistTaps="handled" 
        showsVerticalScrollIndicator={false}
      >
        {/* Card 1: Start Location Configuration */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.onSurface }]}>Start Location</Text>
          
          <View style={[styles.inputContainer, { backgroundColor: colors.surfaceLow }]}>
            <MaterialIcons name="my-location" size={18} color={colors.primary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.onSurface }]}
              value={startAddress}
              onChangeText={setStartAddress}
              placeholder="Enter start address"
              placeholderTextColor={colors.outline}
            />
          </View>

          <View style={styles.formRow}>
            <View style={styles.formCol}>
              <Text style={[styles.inputLabel, { color: colors.outline }]}>Departure Time</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.surfaceLow }]}>
                <MaterialIcons name="schedule" size={18} color={colors.outline} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.onSurface }]}
                  value={depTime}
                  onChangeText={setDepTime}
                  placeholder="09:00"
                  maxLength={5}
                />
              </View>
            </View>

            <View style={styles.formCol}>
              <Text style={[styles.inputLabel, { color: colors.outline }]}>Route Mode</Text>
              <View style={[styles.profileSelector, { backgroundColor: colors.surfaceLow }]}>
                <TouchableOpacity
                  style={[styles.profileBtn, profileType === 'fast' && [styles.profileBtnActive, { backgroundColor: colors.surface }]]}
                  onPress={() => setProfileType('fast')}
                >
                  <Text style={[styles.profileBtnText, { color: colors.outline }, profileType === 'fast' && { color: colors.primary, fontWeight: '600' }]}>
                    Fast
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.profileBtn, profileType === 'economic' && [styles.profileBtnActive, { backgroundColor: colors.surface }]]}
                  onPress={() => setProfileType('economic')}
                >
                  <Text style={[styles.profileBtnText, { color: colors.outline }, profileType === 'economic' && { color: colors.primary, fontWeight: '600' }]}>
                    Eco
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={[styles.switchRow, { borderTopColor: colors.surfaceContainer }]}>
            <Text style={[styles.switchLabel, { color: colors.onSurface }]}>Return to starting point</Text>
            <Switch
              value={returnToStart}
              onValueChange={setReturnToStart}
              trackColor={{ false: colors.surfaceContainerHigh, true: colors.primary }}
              thumbColor={Platform.OS === 'ios' ? undefined : '#FFFFFF'}
            />
          </View>
        </View>

        {/* Card 2: Stop Search Prediction */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.onSurface }]}>Search & Add Stops</Text>
          
          <View style={[styles.searchBar, { backgroundColor: colors.surfaceLow }]}>
            <MaterialIcons name="search" size={20} color={colors.outline} style={styles.inputIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.onSurface }]}
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                setShowSearchResults(text.length > 0);
              }}
              placeholder="Find a location..."
              placeholderTextColor={colors.outline}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setShowSearchResults(false); }}>
                <MaterialIcons name="close" size={20} color={colors.outline} />
              </TouchableOpacity>
            )}
          </View>

          {showSearchResults && (
            <View style={[styles.resultsList, { backgroundColor: colors.surfaceLow, borderColor: colors.surfaceContainer }]}>
              {filteredPlaces.map((place, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.resultItem, { borderBottomColor: colors.surfaceContainer }]}
                  onPress={() => handleSelectPlace(place)}
                >
                  <MaterialIcons name="place" size={18} color={colors.primary} />
                  <Text style={[styles.resultText, { color: colors.onSurface }]} numberOfLines={1}>
                    {place.name}
                  </Text>
                </TouchableOpacity>
              ))}
              {filteredPlaces.length === 0 && (
                <View style={styles.noResult}>
                  <Text style={[styles.noResultText, { color: colors.outline }]}>No matching locations found.</Text>
                </View>
              )}
            </View>
          )}

          {/* Quick Custom Add Row */}
          <View style={styles.customAddRow}>
            <View style={[styles.inputContainer, { flex: 1, backgroundColor: colors.surfaceLow, marginBottom: 0 }]}>
              <MaterialIcons name="add-location" size={18} color={colors.outline} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.onSurface }]}
                value={customPlaceName}
                onChangeText={setCustomPlaceName}
                placeholder="Or type custom place name..."
                placeholderTextColor={colors.outline}
              />
            </View>
            <TouchableOpacity 
              style={[styles.customAddButton, { backgroundColor: colors.primary }]} 
              onPress={handleAddCustomPlace}
            >
              <Text style={[styles.customAddButtonText, { color: colors.onPrimary }]}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Backend Validation Errors */}
        {error && (
          <View style={[styles.errorBox, { backgroundColor: colors.errorContainer + '15', borderColor: colors.error }]}>
            <MaterialIcons name="warning" size={18} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        )}

        {/* Stops Itinerary Title */}
        <Text style={[styles.sectionTitleLabel, { color: colors.outline }]}>
          Draft Stops ({draftStops.length})
        </Text>

        {/* Reorderable Draft StopList */}
        <StopList
          stops={draftStops.map((s, idx) => ({
            id: String(idx),
            placeName: s.placeName,
            visitDurationMinutes: s.visitDurationMinutes ?? 15,
            priority: (s.priority as any) ?? 'normal',
            stopType: s.stopType ?? 'errand',
            timeWindowStart: s.timeWindowStart,
            timeWindowEnd: s.timeWindowEnd,
          }) as StopListItem)}
          onReorder={(newOrder) => {
            const mapped = newOrder.map(item => draftStops[parseInt(item.id!, 10)]);
            reorderDraftStops(mapped);
          }}
          onEditStop={(idx) => router.push({
            pathname: '/(tabs)/journey/stop-detail' as any,
            params: { stopIndex: String(idx) },
          })}
          onDeleteStop={(idx) => {
            deleteDraftStop(idx);
          }}
          isManualOverride={true}
        />
      </ScrollView>

      {/* Sticky Bottom Actions */}
      <View style={[styles.footer, { backgroundColor: 'rgba(255, 255, 255, 0.9)', borderTopColor: 'rgba(0, 0, 0, 0.04)' }]}>
        {isLoading ? (
          <View style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: 0.8 }]}>
            <ActivityIndicator color={colors.onPrimary} size="small" />
            <Text style={[styles.primaryBtnText, { color: colors.onPrimary }]}>
              Calculating Route...
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.primaryBtn, 
              { backgroundColor: colors.primary },
              draftStops.length === 0 && { backgroundColor: colors.surfaceContainerHigh }
            ]}
            disabled={draftStops.length === 0}
            onPress={handleBuildJourney}
            activeOpacity={0.85}
          >
            <MaterialIcons name="auto-awesome" size={20} color={draftStops.length === 0 ? colors.outline : colors.onPrimary} />
            <Text style={[
              styles.primaryBtnText, 
              { color: colors.onPrimary },
              draftStops.length === 0 && { color: colors.outline }
            ]}>
              Optimize & Build Itinerary
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 60,
    height: 44,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  clearBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scroll: {
    padding: Spacing.marginMain,
    paddingBottom: 120, // Cushion for sticky footer
    gap: Spacing.stackMd,
  },
  card: {
    borderRadius: Rounded.xl,
    padding: 16,
    gap: 12,
    shadowColor: 'rgba(0, 0, 0, 0.02)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderRadius: Rounded.xl,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    height: '100%',
    padding: 0,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formCol: {
    flex: 1,
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 4,
  },
  profileSelector: {
    flexDirection: 'row',
    height: 46,
    borderRadius: Rounded.xl,
    padding: 3,
  },
  profileBtn: {
    flex: 1,
    borderRadius: Rounded.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBtnActive: {
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  profileBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 4,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: Rounded.xl,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    height: '100%',
    padding: 0,
  },
  resultsList: {
    borderRadius: Rounded.xl,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: -4,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderBottomWidth: 1,
  },
  resultText: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  noResult: {
    padding: 14,
    alignItems: 'center',
  },
  noResultText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  customAddRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  customAddButton: {
    height: 46,
    paddingHorizontal: 20,
    borderRadius: Rounded.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customAddButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: Rounded.xl,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  sectionTitleLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 4,
    marginTop: Spacing.stackSm,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.marginMain,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    borderTopWidth: 1,
  },
  primaryBtn: {
    height: 56,
    borderRadius: Rounded.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: 'rgba(42, 20, 180, 0.25)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: '600',
  },
});
