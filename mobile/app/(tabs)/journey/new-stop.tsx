import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Animated,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useJourneyStore } from '@/store/journeyStore';
import StopList, { StopListItem } from '@/components/StopList';
import { Colors, Spacing, Rounded, Shadow, Typography, TabBarHeight } from '@/constants/theme';
import { ScreenHeader } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { placesApi, PlaceResult } from '@/api/places';
import MapLocationView, { MapMarkerItem } from '@/components/MapLocationView';
import { useSavedLocationStore } from '@/store/savedLocationStore';
import MapLocationPickerModal, { PickedLocationResult } from '@/components/MapLocationPickerModal';

const C = Colors.light;

export default function NewStopScreen() {
  const router = useRouter();
  
  const {
    draftStops,
    addDraftStop,
    deleteDraftStop,
    reorderDraftStops,
    clearDraftStops,
    createJourney,
    optimizeJourney,
    isLoading,
    error,
  } = useJourneyStore();

  const { locations: savedLocations, fetchLocations } = useSavedLocationStore();

  // Starting location states
  const [startAddress, setStartAddress] = useState('Mevcut Konum (Kadıköy)');
  const [startLat, setStartLat] = useState(40.9909);
  const [startLng, setStartLng] = useState(29.0303);
  const [isLocating, setIsLocating] = useState(false);

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Map Picker State
  const [pickerModalVisible, setPickerModalVisible] = useState(false);

  // Dynamic Suggestions State (STOP-003)
  const [suggestedPlaces, setSuggestedPlaces] = useState<any[]>([]);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);

  // Request GPS Location
  const requestGPSLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;
      setStartLat(latitude);
      setStartLng(longitude);

      const address = await placesApi.reverseGeocode(latitude, longitude);
      if (address) {
        setStartAddress(address);
      }
    } catch (err) {
      console.warn('Error fetching GPS location:', err);
    } finally {
      setIsLocating(false);
    }
  };

  useEffect(() => {
    requestGPSLocation();
    fetchLocations();
  }, []);

  // Fetch dynamic recommendations (STOP-003)
  useEffect(() => {
    if (startLat !== 41.0082 && startLng !== 28.9784) {
      loadRecommendations(startLat, startLng);
    }
  }, [startLat, startLng]);

  const loadRecommendations = async (lat: number, lng: number) => {
    setIsSuggestionsLoading(true);
    try {
      const results = await placesApi.getRecommendations(lat, lng, 3000);
      const mapped = results.map(r => {
        let type = 'Nokta';
        let icon = 'place';
        
        const nameLower = (r.name || '').toLowerCase();
        if (nameLower.includes('cafe') || nameLower.includes('kahve') || nameLower.includes('starbucks')) {
          type = 'Kahve & Mola';
          icon = 'local-cafe';
        } else if (nameLower.includes('park')) {
          type = 'Açık Alan';
          icon = 'park';
        } else if (nameLower.includes('istasyon') || nameLower.includes('station') || nameLower.includes('marmaray') || nameLower.includes('metro')) {
          type = 'Toplu Taşıma';
          icon = 'train';
        }

        return {
          title: r.name || 'Önerilen Yer',
          type,
          lat: r.lat,
          lng: r.lng,
          icon,
        };
      });
      // Sort and take top 4
      setSuggestedPlaces(mapped.slice(0, 4));
    } catch (e) {
      console.warn('Failed to load recommendations', e);
    } finally {
      setIsSuggestionsLoading(false);
    }
  };

  // Debounced search for places
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await placesApi.search(searchQuery);
        setSearchResults(results);
        setShowSearchResults(true);
      } catch (err) {
        console.warn('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectPlace = (place: PlaceResult) => {
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

  const handleQuickAdd = (name: string, lat: number, lng: number, type: string) => {
    router.push({
      pathname: '/(tabs)/journey/stop-detail' as any,
      params: {
        placeName: name,
        lat: String(lat),
        lng: String(lng),
        stopType: type,
      },
    });
  };

  const handleOptimizeAndBuild = async () => {
    if (draftStops.length === 0) {
      Alert.alert('Durak Gerekli', 'Lütfen rotanızı oluşturmak için en az bir durak ekleyin.');
      return;
    }

    const today = new Date();
    const plannedDepartureTime = today.toISOString().slice(0, 19);

    try {
      const requestBody = {
        startLat,
        startLng,
        startAddressText: startAddress,
        plannedDepartureTime,
        stops: draftStops,
      };

      const journey = await createJourney(requestBody);
      if (journey) {
        // Pass destination separately if available (ROUTE-007)
        const destStore = useJourneyStore.getState().draftDestination;
        const destParams = destStore ? { lat: destStore.latitude, lng: destStore.longitude } : undefined;

        const success = await optimizeJourney(journey.id, {
          returnToStart: false,
          destination: destParams,
          preferences: {
            profileType: 'fast',
            avoidTolls: false,
            avoidHighways: false,
          },
        });

        if (success) {
          clearDraftStops();
          router.replace('/(tabs)/journey/plan-result' as any);
        } else {
          const err = useJourneyStore.getState().error || 'Rota optimizasyonu gerçekleştirilemedi.';
          Alert.alert('Optimizasyon Uyarısı', err);
        }
      } else {
        const err = useJourneyStore.getState().error || 'Yolculuk taslağı sunucuda oluşturulamadı.';
        Alert.alert('Hata', err);
      }
    } catch (e: any) {
      Alert.alert('Bağlantı Hatası', e?.userMessage || 'Sunucu ile iletişim kurulamadı.');
    }
  };

  const recentSearches = [
    { title: 'Bağdat Caddesi No: 240', subtitle: '15 dk · 6.2 km', lat: 40.965, lng: 29.071, icon: 'storefront' },
    { title: 'Zorlu Center AVM', subtitle: '28 dk · 18.5 km', lat: 41.066, lng: 29.017, icon: 'shopping-bag' },
    { title: 'Sabiha Gökçen Havalimanı', subtitle: '45 dk · 38 km', lat: 40.898, lng: 29.309, icon: 'flight' },
  ];

  const mapMarkers = React.useMemo<MapMarkerItem[]>(() => {
    const list: MapMarkerItem[] = [];
    list.push({
      id: 'start',
      latitude: startLat,
      longitude: startLng,
      title: 'Başlangıç Noktası',
      subtitle: startAddress,
      type: 'start',
    });
    draftStops.forEach((stop, index) => {
      list.push({
        id: `stop_${index}`,
        latitude: stop.lat,
        longitude: stop.lng,
        title: stop.placeName,
        subtitle: stop.placeName || '',
        type: 'stop',
        sequenceIndex: index,
      });
    });
    return list;
  }, [startLat, startLng, startAddress, draftStops]);

  const routePolyline = React.useMemo(() => {
    const coords = [{ latitude: startLat, longitude: startLng }];
    draftStops.forEach((stop) => coords.push({ latitude: stop.lat, longitude: stop.lng }));
    return coords.length > 1 ? coords : [];
  }, [startLat, startLng, draftStops]);

  const handlePickerSelect = (result: PickedLocationResult) => {
    router.push({
      pathname: '/(tabs)/journey/stop-detail' as any,
      params: {
        placeName: result.placeName,
        lat: String(result.latitude),
        lng: String(result.longitude),
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScreenHeader
        title="Durak Ekle"
        rightComponent={
          draftStops.length > 0 ? (
            <TouchableOpacity onPress={clearDraftStops} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>Sıfırla</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar Input (Nereye?) */}
        <View style={styles.searchCard}>
          <View style={styles.searchRow}>
            <MaterialIcons name="search" size={22} color={C.primary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Nereye gitmek istiyorsunuz?"
              placeholderTextColor={C.outline}
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                setShowSearchResults(text.length > 0);
              }}
              autoFocus={draftStops.length === 0}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  setShowSearchResults(false);
                }}
              >
                <MaterialIcons name="close" size={20} color={C.outline} />
              </TouchableOpacity>
            )}
          </View>

          {/* Autocomplete Results Dropdown */}
          {showSearchResults && (
            <View style={styles.resultsBox}>
              {isSearching ? (
                <View style={styles.searchLoading}>
                  <ActivityIndicator size="small" color={C.primary} />
                  <Text style={styles.searchLoadingText}>Aranıyor...</Text>
                </View>
              ) : searchResults.length > 0 ? (
                searchResults.map((place, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.resultRow}
                    onPress={() => handleSelectPlace(place)}
                  >
                    <MaterialIcons name="place" size={20} color={C.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultTitle} numberOfLines={1}>
                        {place.name}
                      </Text>
                      {place.vicinity && (
                        <Text style={styles.resultSub} numberOfLines={1}>
                          {place.vicinity}
                        </Text>
                      )}
                    </View>
                    <MaterialIcons name="add" size={20} color={C.outline} />
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptySearch}>
                  <Text style={styles.emptySearchText}>Konum bulunamadı</Text>
                </View>
              )}
            </View>
          )}

          {/* Quick Shortcuts Chips (Mevcut, Ev, İş) */}
          <View style={styles.shortcutsRow}>
            <TouchableOpacity
              style={styles.shortcutChip}
              onPress={requestGPSLocation}
              activeOpacity={0.7}
            >
              <MaterialIcons name="my-location" size={16} color={C.primary} />
              <Text style={styles.shortcutText}>Mevcut</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shortcutChip}
              onPress={() => handleQuickAdd('Ev', 40.985, 29.04, 'meeting')}
              activeOpacity={0.7}
            >
              <MaterialIcons name="home" size={16} color={C.secondary} />
              <Text style={styles.shortcutText}>Ev</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shortcutChip}
              onPress={() => handleQuickAdd('İş', 41.075, 29.01, 'meeting')}
              activeOpacity={0.7}
            >
              <MaterialIcons name="work" size={16} color={C.tertiary} />
              <Text style={styles.shortcutText}>İş</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Map View & Add from Map Button */}
        <View style={styles.sectionBlock}>
          <View style={styles.mapContainerRow}>
             <Text style={styles.sectionHeading}>GÜNCEL ROTA HARİTASI</Text>
             <TouchableOpacity 
                style={styles.mapAddButton} 
                activeOpacity={0.8}
                onPress={() => setPickerModalVisible(true)}
             >
               <MaterialIcons name="map" size={16} color={C.onPrimary} />
               <Text style={styles.mapAddButtonText}>Haritadan Seç</Text>
             </TouchableOpacity>
          </View>
          <View style={styles.mapWrapper}>
            <MapLocationView
              height={180}
              initialLocation={{ latitude: startLat, longitude: startLng }}
              markers={mapMarkers}
              routePolyline={routePolyline}
              expandable={true}
            />
          </View>
        </View>

        {/* Selected Draft Stops List */}
        {draftStops.length > 0 && (
          <View style={styles.draftSection}>
            <Text style={styles.sectionHeading}>
              SEÇİLEN DURAKLAR ({draftStops.length})
            </Text>
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
              onDeleteStop={(idx) => deleteDraftStop(idx)}
              isManualOverride={true}
            />
          </View>
        )}

        {/* Recent Searches (Son Aramalar) */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeading}>SON ARAMALAR</Text>
          <View style={styles.itemList}>
            {recentSearches.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.itemCard}
                activeOpacity={0.7}
                onPress={() => handleQuickAdd(item.title, item.lat, item.lng, 'errand')}
              >
                <View style={styles.itemIconBg}>
                  <MaterialIcons name={item.icon as any} size={18} color={C.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemSub}>{item.subtitle}</Text>
                </View>
                <MaterialIcons name="add-circle-outline" size={22} color={C.primary} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Saved Locations (Kaydedilenler - FUT-001) */}
        {savedLocations.length > 0 && (
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionHeading}>KAYDEDİLENLER</Text>
            <View style={styles.itemList}>
              {savedLocations.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.itemCard}
                  activeOpacity={0.7}
                  onPress={() => handleQuickAdd(item.label, item.lat, item.lng, item.category || 'poi')}
                >
                  <View style={[styles.itemIconBg, { backgroundColor: C.primary + '20' }]}>
                    <MaterialIcons 
                      name={item.category === 'favorite' ? 'favorite' : 'bookmark'} 
                      size={18} 
                      color={C.primary} 
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{item.label}</Text>
                    <Text style={styles.itemSub}>{item.address}</Text>
                  </View>
                  <MaterialIcons name="add-circle-outline" size={22} color={C.primary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Suggested Places (Önerilenler) */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeading}>ÖNERİLENLER</Text>
          <View style={styles.itemList}>
            {isSuggestionsLoading ? (
              <ActivityIndicator size="small" color={C.primary} style={{ padding: 20 }} />
            ) : suggestedPlaces.length === 0 ? (
              <Text style={{ textAlign: 'center', color: C.textSecondary, padding: 20 }}>Yakınlarda öneri bulunamadı.</Text>
            ) : (
              suggestedPlaces.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.itemCard}
                activeOpacity={0.7}
                onPress={() => handleQuickAdd(item.title, item.lat, item.lng, 'poi')}
              >
                <View style={[styles.itemIconBg, { backgroundColor: C.secondaryContainer }]}>
                  <MaterialIcons name={item.icon as any} size={18} color={C.secondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemSub}>{item.type}</Text>
                </View>
                <MaterialIcons name="add-circle-outline" size={22} color={C.primary} />
              </TouchableOpacity>
              ))
            )}
          </View>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <MaterialIcons name="error-outline" size={18} color={C.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>

      {/* Sticky Bottom Optimize Button */}
      <View style={styles.footer}>
        <Button
          label={isLoading ? 'Optimize Ediliyor...' : `Rotayı Optimize Et (${draftStops.length} Durak)`}
          variant="primary"
          size="lg"
          fullWidth
          disabled={draftStops.length === 0}
          loading={isLoading}
          icon="auto-awesome"
          onPress={handleOptimizeAndBuild}
        />
      </View>
      </KeyboardAvoidingView>

      <MapLocationPickerModal
        visible={pickerModalVisible}
        onClose={() => setPickerModalVisible(false)}
        mode="stop"
        initialCoordinates={{ latitude: startLat, longitude: startLng }}
        existingMarkers={mapMarkers as any}
        onSelectLocation={handlePickerSelect}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.background,
  },
  clearBtn: {
    paddingHorizontal: Spacing.sm,
  },
  clearBtnText: {
    ...Typography.bodySmall,
    color: C.error,
    fontWeight: '600',
  },
  scroll: {
    padding: Spacing.gutter,
    paddingBottom: Spacing.xl,
    gap: Spacing.base,
  },
  searchCard: {
    backgroundColor: C.surface,
    borderRadius: Rounded.xl,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadow.md,
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surfaceLow,
    borderRadius: Rounded.lg,
    paddingHorizontal: Spacing.md,
    height: 48,
    gap: Spacing.sm,
  },
  searchInput: {
    ...Typography.bodyMedium,
    color: C.text,
    flex: 1,
    padding: 0,
  },
  shortcutsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  shortcutChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surfaceLow,
    borderRadius: Rounded.md,
    paddingVertical: 8,
    gap: 6,
  },
  shortcutText: {
    ...Typography.caption,
    fontWeight: '600',
    color: C.text,
  },
  resultsBox: {
    backgroundColor: C.surface,
    borderRadius: Rounded.lg,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    overflow: 'hidden',
  },
  searchLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.base,
    gap: Spacing.sm,
  },
  searchLoadingText: {
    ...Typography.caption,
    color: C.textSecondary,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.outlineVariant,
  },
  resultTitle: {
    ...Typography.bodyMedium,
    fontWeight: '600',
    color: C.text,
  },
  resultSub: {
    ...Typography.caption,
    color: C.textSecondary,
  },
  emptySearch: {
    padding: Spacing.base,
    alignItems: 'center',
  },
  emptySearchText: {
    ...Typography.caption,
    color: C.textSecondary,
  },
  draftSection: {
    gap: Spacing.sm,
  },
  sectionBlock: {
    gap: Spacing.sm,
  },
  mapContainerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  mapAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Rounded.full,
    gap: 4,
  },
  mapAddButtonText: {
    ...Typography.caption,
    color: C.onPrimary,
    fontWeight: '600',
  },
  mapWrapper: {
    borderRadius: Rounded.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  sectionHeading: {
    ...Typography.caption,
    fontWeight: '700',
    color: C.outline,
    letterSpacing: 0.8,
    paddingHorizontal: 4,
  },
  itemList: {
    gap: Spacing.xs,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: Rounded.xl,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadow.sm,
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  itemIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    ...Typography.bodyMedium,
    fontWeight: '600',
    color: C.text,
  },
  itemSub: {
    ...Typography.caption,
    color: C.textSecondary,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.errorContainer,
    borderRadius: Rounded.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  errorText: {
    ...Typography.bodySmall,
    color: C.error,
    flex: 1,
  },
  footer: {
    paddingHorizontal: Spacing.gutter,
    paddingTop: Spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? Spacing.xs : Spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.outlineVariant,
  },
});
