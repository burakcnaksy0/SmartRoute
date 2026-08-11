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
  Alert,
  Animated,
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
  }, []);

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
        const success = await optimizeJourney(journey.id, {
          returnToStart: false,
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
      Alert.alert('Bağlantı Hatası', e?.message || 'Sunucu ile iletişim kurulamadı.');
    }
  };

  const recentSearches = [
    { title: 'Bağdat Caddesi No: 240', subtitle: '15 dk · 6.2 km', lat: 40.965, lng: 29.071, icon: 'storefront' },
    { title: 'Zorlu Center AVM', subtitle: '28 dk · 18.5 km', lat: 41.066, lng: 29.017, icon: 'shopping-bag' },
    { title: 'Sabiha Gökçen Havalimanı', subtitle: '45 dk · 38 km', lat: 40.898, lng: 29.309, icon: 'flight' },
  ];

  const suggestedPlaces = [
    { title: 'Starbucks Reserve', type: 'Kahve & Mola', lat: 40.978, lng: 29.034, icon: 'local-cafe' },
    { title: 'Marmaray Ayrılık Çeşmesi', type: 'Toplu Taşıma', lat: 41.001, lng: 29.031, icon: 'train' },
    { title: 'Fenerbahçe Parkı', type: 'Açık Alan', lat: 40.969, lng: 29.038, icon: 'park' },
  ];

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

        {/* Suggested Places (Önerilenler) */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeading}>ÖNERİLENLER</Text>
          <View style={styles.itemList}>
            {suggestedPlaces.map((item, idx) => (
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
            ))}
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
