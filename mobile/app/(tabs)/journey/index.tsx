import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Animated,
  Platform,
  Alert,
  KeyboardAvoidingView,
  LayoutAnimation,
  UIManager,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useJourneyStore } from '@/store/journeyStore';
import { placesApi, PlaceResult } from '@/api/places';
import { Colors, Spacing, Rounded, Shadow, Typography } from '@/constants/theme';
import MapLocationView, { MapMarkerItem } from '@/components/MapLocationView';
import MapLocationPickerModal, { PickedLocationResult } from '@/components/MapLocationPickerModal';
import FavoritesModal from '@/components/FavoritesModal';
import JourneySideMenu from '@/components/JourneySideMenu';

const C = Colors.light;

export default function JourneyIndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    currentJourney,
    draftStops,
    draftStartLocation,
    draftDestination,
    setDraftStartLocation,
    setDraftDestination,
    clearDraftStops,
    createJourney,
    optimizeJourney,
    isLoading: isJourneyLoading,
    addRecentDestination,
  } = useJourneyStore();

  // Location states
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number }>(
    draftStartLocation
      ? { latitude: draftStartLocation.latitude, longitude: draftStartLocation.longitude }
      : { latitude: 41.0082, longitude: 28.9784 }
  );
  const [startAddress, setStartAddress] = useState(
    draftStartLocation ? draftStartLocation.address : 'Mevcut Konum'
  );
  const [destinationQuery, setDestinationQuery] = useState(
    draftDestination ? draftDestination.address : ''
  );
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Map Location Picker Modal State
  const [pickerModalVisible, setPickerModalVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState<'start' | 'destination' | 'stop'>('start');

  // Favorites Modal State
  const [favoritesModalVisible, setFavoritesModalVisible] = useState(false);

  // Side Menu State
  const [sideMenuVisible, setSideMenuVisible] = useState(false);

  // Routing Card State
  const [isRoutingCardVisible, setIsRoutingCardVisible] = useState(false);

  const toggleRoutingCard = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsRoutingCardVisible(!isRoutingCardVisible);
  };

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const searchRequestId = useRef(0);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();

    // Infinite pulse animation for live indicator
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.5, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, []);

  // Sync with draftStartLocation if updated externally
  useEffect(() => {
    if (draftStartLocation) {
      setUserCoords({
        latitude: draftStartLocation.latitude,
        longitude: draftStartLocation.longitude,
      });
      setStartAddress(draftStartLocation.address);
    }
  }, [draftStartLocation]);

  // Fetch initial reverse geocoded address when coordinates update
  const handleLocationChange = async (coords: { latitude: number; longitude: number }) => {
    if (!draftStartLocation) {
      setUserCoords(coords);
      try {
        const addr = await placesApi.reverseGeocode(coords.latitude, coords.longitude);
        if (addr) {
          setStartAddress(addr);
          setDraftStartLocation({
            latitude: coords.latitude,
            longitude: coords.longitude,
            address: addr,
          });
        }
      } catch { }
    }
  };

  // Build markers for map view
  const mapMarkers = useMemo<MapMarkerItem[]>(() => {
    const list: MapMarkerItem[] = [];

    // Start Location Marker
    list.push({
      id: 'start_point',
      latitude: userCoords.latitude,
      longitude: userCoords.longitude,
      title: 'Başlangıç Noktası',
      subtitle: startAddress,
      type: 'start',
    });

    // Draft Stops Markers
    draftStops.forEach((stop, index) => {
      list.push({
        id: `draft_stop_${index}`,
        latitude: stop.lat,
        longitude: stop.lng,
        title: stop.placeName,
        subtitle: `${stop.visitDurationMinutes || 15} dk mola`,
        type: 'stop',
        sequenceIndex: index,
        durationMinutes: stop.visitDurationMinutes,
        priority: stop.priority,
      });
    });

    // Destination Marker
    if (draftDestination) {
      list.push({
        id: 'destination_point',
        latitude: draftDestination.latitude,
        longitude: draftDestination.longitude,
        title: 'Hedef Noktası',
        subtitle: draftDestination.address,
        type: 'destination',
      });
    }

    return list;
  }, [userCoords, startAddress, draftStops, draftDestination]);

  // Build polyline coordinates
  const routePolyline = useMemo(() => {
    const coords = [{ latitude: userCoords.latitude, longitude: userCoords.longitude }];
    draftStops.forEach((stop) => coords.push({ latitude: stop.lat, longitude: stop.lng }));
    if (draftDestination) {
      coords.push({ latitude: draftDestination.latitude, longitude: draftDestination.longitude });
    }
    return coords.length > 1 ? coords : [];
  }, [userCoords, draftStops, draftDestination]);

  // Open Map Picker
  const handleOpenPicker = (mode: 'start' | 'destination' | 'stop') => {
    setPickerMode(mode);
    setPickerModalVisible(true);
  };

  // Handle Location Chosen from Picker Modal
  const handlePickerSelect = (result: PickedLocationResult) => {
    if (pickerMode === 'start') {
      setUserCoords({ latitude: result.latitude, longitude: result.longitude });
      setStartAddress(result.address || result.placeName);
      setDraftStartLocation({
        latitude: result.latitude,
        longitude: result.longitude,
        address: result.address || result.placeName,
      });
    } else if (pickerMode === 'destination') {
      setDestinationQuery(result.placeName);
      setDraftDestination({
        latitude: result.latitude,
        longitude: result.longitude,
        address: result.address || result.placeName,
      });

      addRecentDestination({
        title: result.placeName,
        subtitle: result.address || 'Harita Konumu',
        lat: result.latitude,
        lng: result.longitude,
      });

      // Route to stop detail to configure destination parameters
      router.push({
        pathname: '/(tabs)/journey/stop-detail' as any,
        params: {
          placeName: result.placeName,
          lat: String(result.latitude),
          lng: String(result.longitude),
        },
      });
    } else if (pickerMode === 'stop') {
      router.push({
        pathname: '/(tabs)/journey/stop-detail' as any,
        params: {
          placeName: result.placeName,
          lat: String(result.latitude),
          lng: String(result.longitude),
        },
      });
    }
  };

  // Debounced search for destination input. Ignore stale responses when
  // the user types again before the previous request has completed.
  useEffect(() => {
    const requestId = ++searchRequestId.current;

    if (!destinationQuery.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await placesApi.search(destinationQuery);
        if (requestId === searchRequestId.current) {
          setSearchResults(results);
          setShowSearchResults(true);
        }
      } catch (err) {
        if (requestId === searchRequestId.current) {
          setSearchResults([]);
          setShowSearchResults(false);
          console.warn('Destination search error:', err);
        }
      } finally {
        if (requestId === searchRequestId.current) setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [destinationQuery]);

  // Handle selecting a destination from search
  const handleSelectDestination = (place: PlaceResult) => {
    setShowSearchResults(false);
    setIsSearching(false);
    setDestinationQuery(place.name);
    setDraftDestination({
      latitude: place.lat,
      longitude: place.lng,
      address: place.vicinity || place.name,
    });

    addRecentDestination({
      title: place.name,
      subtitle: place.vicinity || 'Arama Sonucu',
      lat: place.lat,
      lng: place.lng,
    });

    // Route to stop detail or add directly as stop
    router.push({
      pathname: '/(tabs)/journey/stop-detail' as any,
      params: {
        placeName: place.name,
        lat: String(place.lat),
        lng: String(place.lng),
      },
    });
  };

  // Optimize & Run route
  const handleOptimizeNow = async () => {
    if (draftStops.length === 0 && !destinationQuery.trim() && !draftDestination) {
      Alert.alert(
        'Durak veya Hedef Gerekli',
        'Rotanızı optimize etmek için lütfen bir hedef arayın veya durak ekleyin.',
        [
          { text: 'Haritadan Seç', onPress: () => handleOpenPicker('destination') },
          { text: 'Durak Ekle', onPress: () => router.push('/(tabs)/journey/new-stop' as any) },
          { text: 'Tamam', style: 'cancel' },
        ]
      );
      return;
    }

    if (destinationQuery.trim() && !draftDestination) {
      Alert.alert(
        'Hedefi Onaylayın',
        'Devam etmek için arama sonuçlarından bir hedef seçin veya haritada bir konum işaretleyin.'
      );
      setShowSearchResults(true);
      return;
    }

    const today = new Date();
    const plannedDepartureTime = today.toISOString().slice(0, 19);

    const stopsToOptimize = [...draftStops];
    let destParams = undefined;
    if (draftDestination) {
      destParams = {
        lat: draftDestination.latitude,
        lng: draftDestination.longitude
      };
    }

    try {
      const requestBody = {
        startLat: userCoords.latitude,
        startLng: userCoords.longitude,
        startAddressText: startAddress,
        plannedDepartureTime,
        stops: stopsToOptimize,
      };

      const journey = await createJourney(requestBody);
      if (journey) {
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
          setDraftDestination(null);
          setDestinationQuery('');
          router.push('/(tabs)/journey/plan-result' as any);
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

  // No hardcoded recentDestinations, using from store

  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    if (isJourneyLoading) {
      const interval = setInterval(() => {
        setLoadingStep((s) => (s + 1) % 3);
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [isJourneyLoading]);

  const loadingMessages = [
    'Trafik Yoğunluğu Analiz Ediliyor...',
    'Alternatif Rotalar Çıkarılıyor...',
    'Maliyet Optimizasyonu Yapılıyor...'
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Map Background */}
      <View style={styles.mapBackground}>
        <MapLocationView
          height="100%"
          initialLocation={userCoords}
          markers={mapMarkers}
          routePolyline={routePolyline}
          expandable={true}
          onLocationChange={handleLocationChange}
          autoCenterOnInitialLocation={!draftStartLocation}
          controlsBottomOffset={insets.bottom + 120}
        />
        <View style={styles.mapOverlayGradient} pointerEvents="none" />
      </View>

      <View style={[styles.safeAreaOverlay, { paddingTop: Math.max(insets.top, 50) }]} pointerEvents="box-none">
        {/* Top Floating Header & Card */}
        <Animated.View
          style={[styles.topContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
          pointerEvents="box-none"
        >
          <View style={styles.floatingHeader}>
            <TouchableOpacity style={styles.headerIcon} onPress={() => setSideMenuVisible(true)}>
              <MaterialIcons name="menu" size={24} color={C.onSurface} />
            </TouchableOpacity>
            <View style={styles.headerTitleBox}>
              <Text style={styles.headerTitle}>SmartRoute</Text>
            </View>
            <TouchableOpacity style={styles.headerIcon} accessibilityLabel="Profil">
              <MaterialIcons name="account-circle" size={28} color={C.primary} />
            </TouchableOpacity>
          </View>

          {/* Plan Route FAB (Visible when card is closed) */}
          {!isRoutingCardVisible && (
            <View style={styles.planRouteFabContainer}>
              <TouchableOpacity style={styles.planRouteFab} onPress={toggleRoutingCard}>
                <MaterialIcons name="add-location-alt" size={24} color={C.onPrimary} />
                <Text style={styles.planRouteFabText}>Rota Planla</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Main Routing Card Moved to Top */}
          {isRoutingCardVisible && (
            <View style={[styles.routingCardGlass, { marginTop: Spacing.md }]}>
              {/* Header / Title inside Card */}
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardHeaderTitle}>Rotanızı Planlayın</Text>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                  <TouchableOpacity style={styles.addStopSmallBtn} onPress={() => router.push('/(tabs)/journey/new-stop' as any)}>
                    <MaterialIcons name="add" size={16} color={C.primary} />
                    <Text style={styles.addStopSmallText}>
                      {draftStops.length > 0 ? `Duraklar (${draftStops.length})` : 'Durak Ekle'}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.closeCardBtn} onPress={toggleRoutingCard}>
                    <MaterialIcons name="keyboard-arrow-up" size={24} color={C.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

            {/* Input Area */}
            <View style={styles.inputArea}>
              <View style={styles.verticalDashedLine} />

              {/* Start */}
              <TouchableOpacity style={styles.locationRow} onPress={() => handleOpenPicker('start')}>
                <View style={styles.startDotBadge}><View style={styles.startDotInner} /></View>
                <View style={styles.locationBox}>
                  <Text style={styles.locationText} numberOfLines={1}>{startAddress}</Text>
                  <MaterialIcons name="my-location" size={20} color={C.onSurfaceVariant + '80'} />
                </View>
              </TouchableOpacity>

              {/* End */}
              <View style={styles.locationRow}>
                <View style={styles.endPinBadge}><MaterialIcons name="location-on" size={16} color={C.error} /></View>
                <View style={styles.locationBoxEnd}>
                  <TextInput
                    value={destinationQuery}
                    onChangeText={(value) => {
                      setDestinationQuery(value);
                      if (draftDestination) setDraftDestination(null);
                    }}
                    placeholder="Hedef konum seçin"
                    placeholderTextColor={C.onSurfaceVariant}
                    style={styles.destinationInput}
                    returnKeyType="search"
                    accessibilityLabel="Hedef konumu ara"
                    onFocus={() => destinationQuery.trim() && setShowSearchResults(true)}
                  />
                  <TouchableOpacity
                    style={styles.mapPickerButton}
                    onPress={() => handleOpenPicker('destination')}
                    accessibilityLabel="Hedefi haritadan seç"
                  >
                    <MaterialIcons name="map" size={19} color={C.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {showSearchResults && (
              <View style={styles.searchResultsCard}>
                {isSearching ? (
                  <ActivityIndicator size="small" color={C.primary} />
                ) : searchResults.length > 0 ? (
                  searchResults.slice(0, 4).map((place) => (
                    <TouchableOpacity
                      key={`${place.name}-${place.lat}-${place.lng}`}
                      style={styles.searchResultItem}
                      onPress={() => handleSelectDestination(place)}
                      accessibilityRole="button"
                    >
                      <View style={styles.searchResultIcon}>
                        <MaterialIcons name="place" size={18} color={C.primary} />
                      </View>
                      <View style={styles.searchResultText}>
                        <Text style={styles.searchResultTitle} numberOfLines={1}>{place.name}</Text>
                        <Text style={styles.searchResultSubtitle} numberOfLines={1}>
                          {place.vicinity || 'Harita konumu'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.emptySearchText}>Sonuç bulunamadı</Text>
                )}
              </View>
            )}

            {/* Primary Action Button */}
            <TouchableOpacity
              style={[styles.optimizeButton, isJourneyLoading && styles.optimizeButtonDisabled]}
              onPress={handleOptimizeNow}
              disabled={isJourneyLoading}
              accessibilityRole="button"
              accessibilityLabel="Yolculuğu optimize et"
            >
              <MaterialIcons name="route" size={24} color={C.onPrimary} />
              <Text style={styles.optimizeButtonText}>Yolculuğu Optimize Et</Text>
            </TouchableOpacity>
          </View>
          )}
        </Animated.View>

        {/* Space for map interaction */}
        <View style={styles.flexGrowSpacer} pointerEvents="none" />

        {/* Bottom Floating Area */}
        <View
          style={[
            styles.bottomFloatingContainer,
            { paddingBottom: Platform.OS === 'ios' ? 120 : 100 },
          ]}
          pointerEvents="box-none"
        >
          {/* Active Journey Banner Floating above tabs if exists */}
          {currentJourney?.status === 'active' && (
            <TouchableOpacity
              style={styles.activeBannerFloating}
              activeOpacity={0.9}
              onPress={() => router.push('/(tabs)/journey/active-journey' as any)}
            >
              <Animated.View style={[styles.activePulse, { transform: [{ scale: pulseAnim }] }]}>
                <View style={styles.activeDot} />
              </Animated.View>
              <View style={{ flex: 1 }}>
                <Text style={styles.activeTitle}>Devam Eden Yolculuk</Text>
                <Text style={styles.activeSub} numberOfLines={1}>
                  {currentJourney.startAddressText || 'Aktif Rota'}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={C.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Loading Overlay */}
      {isJourneyLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={C.primary} style={{ marginBottom: 16 }} />
            <Text style={styles.loadingTitle}>Akıllı Optimizasyon</Text>
            <Text style={styles.loadingText}>{loadingMessages[loadingStep]}</Text>
          </View>
        </View>
      )}


      {/* Interactive Map Location Picker Modal */}
      <MapLocationPickerModal
        visible={pickerModalVisible}
        onClose={() => setPickerModalVisible(false)}
        mode={pickerMode}
        initialCoordinates={
          pickerMode === 'start'
            ? userCoords
            : draftDestination
              ? { latitude: draftDestination.latitude, longitude: draftDestination.longitude }
              : userCoords
        }
        initialAddress={pickerMode === 'start' ? startAddress : undefined}
        onSelectLocation={handlePickerSelect}
      />

      {/* Favorites Modal */}
      <FavoritesModal
        visible={favoritesModalVisible}
        onClose={() => setFavoritesModalVisible(false)}
        onSelect={(lat, lng, address, name, type) => {
          if (type === 'start') {
            setUserCoords({ latitude: lat, longitude: lng });
            setStartAddress(name);
            setDraftStartLocation({ latitude: lat, longitude: lng, address: name });
          } else if (type === 'destination') {
            setDestinationQuery(name);
            setDraftDestination({ latitude: lat, longitude: lng, address: name });
          } else if (type === 'stop') {
            router.push({
              pathname: '/(tabs)/journey/stop-detail' as any,
              params: { placeName: name, lat: String(lat), lng: String(lng) },
            });
          }
        }}
      />

      {/* Side Menu */}
      <JourneySideMenu
        visible={sideMenuVisible}
        onClose={() => setSideMenuVisible(false)}
        onNavigate={(route) => router.push(route as any)}
        onOpenFavorites={() => setFavoritesModalVisible(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  mapBackground: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  mapOverlayGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(250, 248, 255, 0.15)', // Very light opacity so map is clear
  },
  safeAreaOverlay: {
    flex: 1,
    zIndex: 10,
    justifyContent: 'space-between',
    width: '100%',
  },
  topContainer: {
    paddingHorizontal: Spacing.marginMain,
    paddingTop: Spacing.sm,
  },
  floatingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 100,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    minHeight: 56,
    ...Shadow.md,
  },
  headerIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: C.surfaceContainerLowest,
  },
  headerTitleBox: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.h4,
    color: C.onSurface,
    fontWeight: '700',
  },
  flexGrowSpacer: {
    flex: 1,
  },
  activeBannerFloating: {
    marginHorizontal: Spacing.marginMain,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: Rounded.xl,
    padding: Spacing.md,
    gap: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: C.primary,
    ...Shadow.lg,
  },
  activePulse: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.primary,
  },
  activeTitle: {
    ...Typography.caption,
    fontWeight: '700',
    color: C.primary,
    textTransform: 'uppercase',
  },
  activeSub: {
    ...Typography.bodySmall,
    color: C.text,
    fontWeight: '600',
  },
  bottomFloatingContainer: {
    width: '100%',
    paddingHorizontal: Spacing.marginMain,
    paddingBottom: Platform.OS === 'ios' ? 96 : 76,
  },
  chipsScroll: {
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  chipActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: 100,
    gap: Spacing.xs,
    ...Shadow.sm,
  },
  chipActiveText: {
    ...Typography.label,
    color: C.primary,
  },
  chipInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: 100,
    gap: Spacing.xs,
    ...Shadow.sm,
  },
  chipInactiveText: {
    ...Typography.label,
    color: C.onSurfaceVariant,
  },
  planRouteFabContainer: {
    alignItems: 'flex-end',
    marginTop: Spacing.md,
  },
  planRouteFab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Rounded.full,
    gap: Spacing.sm,
    ...Shadow.lg,
  },
  planRouteFabText: {
    ...Typography.button,
    color: C.onPrimary,
  },
  closeCardBtn: {
    padding: 4,
    borderRadius: 16,
    backgroundColor: C.surfaceContainer,
  },
  routingCardGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: Rounded['2xl'],
    padding: Spacing.lg,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
    ...Shadow.xl,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  cardHeaderTitle: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    color: C.onSurface,
  },
  addStopSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.primaryFixed,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Rounded.full,
    gap: 4,
  },
  addStopSmallText: {
    ...Typography.caption,
    color: C.primary,
    fontWeight: '700',
  },
  inputArea: {
    position: 'relative',
    gap: Spacing.base,
    marginBottom: Spacing.xl,
  },
  verticalDashedLine: {
    position: 'absolute',
    left: 15,
    top: 24,
    bottom: 24,
    width: 2,
    borderLeftWidth: 1,
    borderLeftColor: C.outlineVariant,
    borderStyle: 'dashed',
    opacity: 0.5,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  startDotBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(59, 53, 208, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  startDotInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: C.primary,
  },
  locationBox: {
    flex: 1,
    backgroundColor: C.surfaceContainerLow,
    borderRadius: Rounded.xl,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationText: {
    ...Typography.bodyMedium,
    color: C.onSurface,
  },
  endPinBadge: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  locationBoxEnd: {
    flex: 1,
    backgroundColor: C.surfaceContainer,
    borderRadius: Rounded.xl,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
  },
  destinationInput: {
    ...Typography.bodyMedium,
    color: C.onSurface,
    flex: 1,
    minWidth: 0,
    padding: 0,
  },
  mapPickerButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    marginLeft: Spacing.xs,
    backgroundColor: C.primaryFixed,
  },
  locationTextPlaceholder: {
    ...Typography.bodyMedium,
    color: C.onSurfaceVariant,
  },
  searchResultsCard: {
    marginTop: -Spacing.sm,
    marginLeft: 48,
    backgroundColor: C.surface,
    borderRadius: Rounded.lg,
    paddingVertical: Spacing.xs,
    maxHeight: 220,
    ...Shadow.md,
  },
  searchResultItem: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    gap: Spacing.sm,
  },
  searchResultIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primaryFixed,
  },
  searchResultText: {
    flex: 1,
    minWidth: 0,
  },
  searchResultTitle: {
    ...Typography.bodySmall,
    color: C.onSurface,
    fontWeight: '700',
  },
  searchResultSubtitle: {
    ...Typography.caption,
    color: C.onSurfaceVariant,
    marginTop: 2,
  },
  emptySearchText: {
    ...Typography.bodySmall,
    color: C.onSurfaceVariant,
    padding: Spacing.md,
    textAlign: 'center',
  },
  recentDestinationsBlock: {
    gap: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    gap: Spacing.base,
    borderRadius: Rounded.lg,
  },
  recentIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentTexts: {
    flex: 1,
  },
  recentTitle: {
    ...Typography.h4,
    color: C.onSurface,
  },
  recentSubtitle: {
    ...Typography.caption,
    color: C.onSurfaceVariant,
    marginTop: 2,
  },
  optimizeButton: {
    width: '100%',
    backgroundColor: C.primary,
    paddingVertical: Spacing.base,
    borderRadius: Rounded.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...Shadow.primary,
  },
  optimizeButtonText: {
    ...Typography.button,
    color: C.onPrimary,
  },
  optimizeButtonDisabled: {
    opacity: 0.65,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(250, 248, 255, 0.8)',
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCard: {
    backgroundColor: C.surface,
    padding: Spacing.xl,
    borderRadius: Rounded['2xl'],
    alignItems: 'center',
    ...Shadow.xl,
  },
  loadingTitle: {
    ...Typography.h3,
    color: C.text,
    marginBottom: Spacing.sm,
  },
  loadingText: {
    ...Typography.bodySmall,
    color: C.primary,
    fontWeight: '600',
  },
});

