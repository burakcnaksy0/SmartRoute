import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Animated,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useJourneyStore } from '@/store/journeyStore';
import { useAuthStore } from '@/store/authStore';
import { placesApi, PlaceResult } from '@/api/places';
import { Colors, Spacing, Rounded, Shadow, Typography, TabBarHeight } from '@/constants/theme';
import MapLocationView, { MapMarkerItem } from '@/components/MapLocationView';
import MapLocationPickerModal, { PickedLocationResult } from '@/components/MapLocationPickerModal';
import { Button } from '@/components/ui/Button';

const C = Colors.light;

export default function JourneyIndexScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    currentJourney,
    draftStops,
    draftStartLocation,
    draftDestination,
    setDraftStartLocation,
    setDraftDestination,
    addDraftStop,
    deleteDraftStop,
    clearDraftStops,
    createJourney,
    optimizeJourney,
    isLoading: isJourneyLoading,
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

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
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
      } catch {}
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

  // Debounced search for destination input
  useEffect(() => {
    if (!destinationQuery.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await placesApi.search(destinationQuery);
        setSearchResults(results);
        setShowSearchResults(true);
      } catch (err) {
        console.warn('Destination search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [destinationQuery]);

  // Handle selecting a destination from search
  const handleSelectDestination = (place: PlaceResult) => {
    setShowSearchResults(false);
    setDestinationQuery(place.name);
    setDraftDestination({
      latitude: place.lat,
      longitude: place.lng,
      address: place.vicinity || place.name,
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

    const today = new Date();
    const plannedDepartureTime = today.toISOString().slice(0, 19);

    const stopsToOptimize = [...draftStops];
    let destParams = undefined;
    if (draftDestination) {
      destParams = {
        lat: draftDestination.latitude,
        lng: draftDestination.longitude
      };
    } else if (destinationQuery.trim()) {
      // Fallback if typed but not selected via map
      destParams = { lat: userCoords.latitude + 0.02, lng: userCoords.longitude + 0.02 };
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

  const recentDestinations = [
    { title: '1200 Tech Bulvarı', subtitle: '42 dk · 28 km', lat: 41.02, lng: 29.01 },
    { title: 'Kadıköy Rıhtım', subtitle: '18 dk · 9.4 km', lat: 40.99, lng: 29.02 },
    { title: 'Maslak İş Merkezi', subtitle: '35 dk · 22 km', lat: 41.11, lng: 29.02 },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />

      {/* Modern Top App Bar */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <MaterialIcons name="explore" size={20} color={C.onPrimary} />
          </View>
          <Text style={styles.brandTitle}>SmartRoute</Text>
        </View>
        <TouchableOpacity
          style={styles.avatarButton}
          activeOpacity={0.8}
          onPress={() => router.push('/(tabs)/profile' as any)}
        >
          <MaterialIcons name="person" size={20} color={C.onPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title Header */}
        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>Yolculuk</Text>
          <Text style={styles.pageSubtitle}>
            Akıllı mobilite ve harita destekli rota planlayıcı
          </Text>
        </View>

        {/* Active Journey Shortcut */}
        {currentJourney?.status === 'active' && (
          <TouchableOpacity
            style={styles.activeBanner}
            activeOpacity={0.9}
            onPress={() => router.push('/(tabs)/journey/active-journey' as any)}
          >
            <View style={styles.activePulse}>
              <View style={styles.activeDot} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.activeTitle}>Devam Eden Yolculuk</Text>
              <Text style={styles.activeSub} numberOfLines={1}>
                {currentJourney.startAddressText || 'Aktif Rota'}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={C.primary} />
          </TouchableOpacity>
        )}

        {/* Optimized Expandable Map View */}
        <View style={styles.mapWrapper}>
          <MapLocationView
            height={260}
            initialLocation={userCoords}
            markers={mapMarkers}
            routePolyline={routePolyline}
            expandable={true}
            onLocationChange={handleLocationChange}
            autoCenterOnInitialLocation={!draftStartLocation}
          />
          {/* Floating Pill on Map */}
          <View style={styles.mapPillOverlay}>
            <View style={styles.mapPill}>
              <View style={styles.liveIndicator} />
              <Text style={styles.mapPillText}>
                {draftStops.length > 0
                  ? `${draftStops.length} Durak Planlandı`
                  : 'Dokunarak Haritayı Büyütün'}
              </Text>
            </View>
          </View>
        </View>

        {/* Intelligent Mobility Route Planning Sheet */}
        <Animated.View
          style={[
            styles.sheetCard,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.handleBar} />

          {/* Start Location (Tap to change via Map Picker) */}
          <TouchableOpacity
            style={styles.locationFieldRow}
            activeOpacity={0.8}
            onPress={() => handleOpenPicker('start')}
            accessibilityLabel="Başlangıç konumunu haritadan değiştir"
          >
            <View style={styles.startDot}>
              <View style={styles.startDotInner} />
            </View>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Başlangıç Konumu</Text>
              <Text style={styles.fieldText} numberOfLines={1}>
                {startAddress}
              </Text>
            </View>
            <View style={styles.editMapBadge}>
              <MaterialIcons name="edit-location" size={16} color={C.primary} />
              <Text style={styles.editMapBadgeText}>Harita</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.connectorLine} />

          {/* Destination Search & Map Selection Row */}
          <View style={styles.destinationFieldRow}>
            <View style={styles.destPin}>
              <MaterialIcons name="place" size={16} color={C.onPrimary} />
            </View>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Hedef Konumu</Text>
              <TextInput
                style={styles.destinationInput}
                placeholder="Nereye gitmek istersiniz?"
                placeholderTextColor={C.outline}
                value={destinationQuery}
                onChangeText={(text) => {
                  setDestinationQuery(text);
                  setShowSearchResults(text.length > 0);
                }}
              />
            </View>

            {destinationQuery.length > 0 ? (
              <TouchableOpacity
                onPress={() => {
                  setDestinationQuery('');
                  setDraftDestination(null);
                  setShowSearchResults(false);
                }}
              >
                <MaterialIcons name="close" size={18} color={C.outline} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.pickMapButton}
                activeOpacity={0.8}
                onPress={() => handleOpenPicker('destination')}
                accessibilityLabel="Hedefi haritadan seç"
              >
                <MaterialIcons name="map" size={18} color={C.primary} />
                <Text style={styles.pickMapButtonText}>Haritadan</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Autocomplete Search Dropdown */}
          {showSearchResults && (
            <View style={styles.searchResultsDropdown}>
              {isSearching ? (
                <View style={styles.searchLoading}>
                  <ActivityIndicator size="small" color={C.primary} />
                  <Text style={styles.searchLoadingText}>Konumlar aranıyor...</Text>
                </View>
              ) : searchResults.length > 0 ? (
                searchResults.map((place, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.searchResultItem}
                    onPress={() => handleSelectDestination(place)}
                  >
                    <MaterialIcons name="location-on" size={18} color={C.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultItemTitle} numberOfLines={1}>
                        {place.name}
                      </Text>
                      {place.vicinity && (
                        <Text style={styles.resultItemSubtitle} numberOfLines={1}>
                          {place.vicinity}
                        </Text>
                      )}
                    </View>
                    <MaterialIcons name="arrow-forward" size={16} color={C.outline} />
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.noResultBox}>
                  <Text style={styles.noResultText}>Eşleşen adres bulunamadı</Text>
                </View>
              )}
            </View>
          )}

          {/* Draft Stops Summary List if any */}
          {draftStops.length > 0 && (
            <View style={styles.draftStopsContainer}>
              <View style={styles.draftStopsHeader}>
                <Text style={styles.draftStopsTitle}>EKLENEN DURAKLAR ({draftStops.length})</Text>
                <TouchableOpacity onPress={clearDraftStops}>
                  <Text style={styles.clearStopsText}>Tümünü Temizle</Text>
                </TouchableOpacity>
              </View>

              {draftStops.map((stop, idx) => (
                <View key={idx} style={styles.draftStopRow}>
                  <View style={styles.draftStopBadge}>
                    <Text style={styles.draftStopBadgeText}>{idx + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.draftStopName} numberOfLines={1}>
                      {stop.placeName}
                    </Text>
                    <Text style={styles.draftStopMeta}>
                      {stop.visitDurationMinutes} dk mola • Öncelik: {stop.priority || 'normal'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeStopBtn}
                    onPress={() => deleteDraftStop(idx)}
                  >
                    <MaterialIcons name="close" size={16} color={C.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Action Pills Row: Haritadan Durak Ekle, Durak Listesi & Tercihler */}
          <View style={styles.actionPillsRow}>
            <TouchableOpacity
              style={styles.addStopPill}
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/journey/new-stop' as any)}
            >
              <MaterialIcons name="add-location-alt" size={18} color={C.primary} />
              <Text style={styles.addStopPillText}>
                {draftStops.length > 0 ? `Duraklar (${draftStops.length})` : 'Durak Ekle'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.mapStopPill}
              activeOpacity={0.8}
              onPress={() => handleOpenPicker('stop')}
            >
              <MaterialIcons name="pin-drop" size={18} color={C.secondary} />
              <Text style={styles.mapStopPillText}>Haritadan Durak</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.prefPill}
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/journey/preferences' as any)}
            >
              <MaterialIcons name="tune" size={18} color={C.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* AI Assistant Banner */}
          <TouchableOpacity
            style={styles.aiAssistantCard}
            activeOpacity={0.9}
            onPress={() => router.push('/(tabs)/journey/nlp-input' as any)}
          >
            <View style={styles.aiSparkleIcon}>
              <MaterialIcons name="auto-awesome" size={20} color={C.onPrimary} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.aiTitle}>Günümü Anlat (AI Asistan)</Text>
              <Text style={styles.aiDesc}>
                Planınızı serbest metinle yazın; yapay zeka durakları ve saatleri otomatik çıkarsın.
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={C.primary} />
          </TouchableOpacity>

          {/* Recent Destinations (Son Aramalar) */}
          <View style={styles.recentSection}>
            <Text style={styles.sectionHeading}>SON ARAMALAR</Text>
            <View style={styles.recentList}>
              {recentDestinations.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.recentItem}
                  activeOpacity={0.7}
                  onPress={() => {
                    setDestinationQuery(item.title);
                    setDraftDestination({
                      latitude: item.lat,
                      longitude: item.lng,
                      address: item.title,
                    });
                    router.push({
                      pathname: '/(tabs)/journey/stop-detail' as any,
                      params: {
                        placeName: item.title,
                        lat: String(item.lat),
                        lng: String(item.lng),
                      },
                    });
                  }}
                >
                  <View style={styles.recentIconBg}>
                    <MaterialIcons name="history" size={18} color={C.textSecondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recentItemTitle}>{item.title}</Text>
                    <Text style={styles.recentItemSub}>{item.subtitle}</Text>
                  </View>
                  <MaterialIcons name="north-west" size={16} color={C.outline} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Floating Bottom Primary CTA: Yolculuğu Optimize Et */}
      <View style={styles.stickyFooter}>
        <Button
          label={isJourneyLoading ? 'Optimize Ediliyor...' : 'Yolculuğu Optimize Et'}
          variant="primary"
          size="lg"
          fullWidth
          icon="alt-route"
          loading={isJourneyLoading}
          onPress={handleOptimizeNow}
        />
      </View>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.background,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.gutter,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.outlineVariant,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: Rounded.md,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    ...Typography.h3,
    color: C.text,
  },
  avatarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  scroll: {
    paddingBottom: TabBarHeight + 90,
  },
  titleSection: {
    paddingHorizontal: Spacing.gutter,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.sm,
  },
  pageTitle: {
    ...Typography.h1,
    color: C.text,
  },
  pageSubtitle: {
    ...Typography.bodySmall,
    color: C.textSecondary,
    marginTop: 2,
  },
  // Active banner
  activeBanner: {
    marginHorizontal: Spacing.gutter,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.primaryFixed,
    borderRadius: Rounded.xl,
    padding: Spacing.md,
    gap: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: C.primary,
    ...Shadow.sm,
  },
  activePulse: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.surface,
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
  // Map
  mapWrapper: {
    position: 'relative',
    marginHorizontal: Spacing.gutter,
    borderRadius: Rounded['2xl'],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.outlineVariant,
    ...Shadow.md,
  },
  mapPillOverlay: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
  },
  mapPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Rounded.full,
    gap: 6,
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.secondary,
  },
  mapPillText: {
    ...Typography.caption,
    fontWeight: '600',
    color: C.text,
  },
  // Sheet card
  sheetCard: {
    marginHorizontal: Spacing.gutter,
    marginTop: Spacing.md,
    backgroundColor: C.surface,
    borderRadius: Rounded['2xl'],
    padding: Spacing.base,
    ...Shadow.lg,
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.outlineVariant,
    alignSelf: 'center',
    marginBottom: Spacing.base,
  },
  locationFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surfaceLow,
    borderRadius: Rounded.xl,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  startDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.secondaryFixedDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.secondary,
  },
  fieldContent: {
    flex: 1,
  },
  fieldLabel: {
    ...Typography.caption,
    color: C.textSecondary,
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  fieldText: {
    ...Typography.bodyMedium,
    color: C.text,
    fontWeight: '600',
    marginTop: 2,
  },
  connectorLine: {
    width: 2,
    height: 14,
    backgroundColor: C.outlineVariant,
    marginLeft: 21,
    marginVertical: 2,
  },
  destinationFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surfaceLow,
    borderRadius: Rounded.xl,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  destPin: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destinationInput: {
    ...Typography.bodyMedium,
    color: C.text,
    fontWeight: '500',
    padding: 0,
    marginTop: 2,
  },
  // Dropdown search
  searchResultsDropdown: {
    backgroundColor: C.surface,
    borderRadius: Rounded.xl,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    marginTop: Spacing.sm,
    overflow: 'hidden',
    ...Shadow.md,
  },
  searchLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  searchLoadingText: {
    ...Typography.bodySmall,
    color: C.textSecondary,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.outlineVariant,
  },
  resultItemTitle: {
    ...Typography.bodyMedium,
    color: C.text,
    fontWeight: '600',
  },
  resultItemSubtitle: {
    ...Typography.caption,
    color: C.textSecondary,
    marginTop: 1,
  },
  noResultBox: {
    padding: Spacing.base,
    alignItems: 'center',
  },
  noResultText: {
    ...Typography.bodySmall,
    color: C.textSecondary,
    fontStyle: 'italic',
  },
  // Action pills
  actionPillsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  addStopPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primaryFixed,
    borderRadius: Rounded.xl,
    paddingVertical: 10,
    gap: 6,
  },
  addStopPillText: {
    ...Typography.bodySmall,
    color: C.primary,
    fontWeight: '700',
  },
  prefPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surfaceLow,
    borderRadius: Rounded.xl,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 6,
  },
  prefPillText: {
    ...Typography.bodySmall,
    color: C.textSecondary,
    fontWeight: '600',
  },
  // AI assistant banner
  aiAssistantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.primaryContainer,
    borderRadius: Rounded.xl,
    padding: Spacing.base,
    gap: Spacing.md,
    marginTop: Spacing.md,
    ...Shadow.sm,
  },
  aiSparkleIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiTitle: {
    ...Typography.bodyMedium,
    color: C.onPrimary,
    fontWeight: '700',
  },
  aiDesc: {
    ...Typography.caption,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 16,
  },
  // Recent section
  recentSection: {
    marginTop: Spacing.base,
    gap: Spacing.sm,
  },
  sectionHeading: {
    ...Typography.caption,
    fontWeight: '700',
    color: C.outline,
    letterSpacing: 0.8,
  },
  recentList: {
    gap: Spacing.xs,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surfaceLow,
    borderRadius: Rounded.lg,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  recentIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentItemTitle: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: C.text,
  },
  recentItemSub: {
    ...Typography.caption,
    color: C.textSecondary,
    marginTop: 2,
  },
  // Draft stops list
  draftStopsContainer: {
    marginTop: Spacing.md,
    backgroundColor: C.surface,
    borderRadius: Rounded.xl,
    padding: Spacing.base,
    ...Shadow.sm,
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  draftStopsHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: Spacing.sm,
  },
  draftStopsTitle: {
    ...Typography.caption,
    fontWeight: '700' as const,
    color: C.outline,
    letterSpacing: 0.8,
  },
  clearStopsText: {
    ...Typography.caption,
    color: C.error,
    fontWeight: '600' as const,
  },
  draftStopRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  draftStopBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.primaryFixed,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  draftStopBadgeText: {
    ...Typography.caption,
    fontWeight: '700' as const,
    color: C.primary,
  },
  draftStopName: {
    ...Typography.bodySmall,
    fontWeight: '600' as const,
    color: C.text,
  },
  draftStopMeta: {
    ...Typography.caption,
    color: C.textSecondary,
    marginTop: 1,
  },
  removeStopBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.surfaceLow,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  // Map stop pill (duplicate for separate styling)
  mapStopPill: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: C.surfaceLow,
    borderRadius: Rounded.xl,
    paddingVertical: 10,
    gap: 6,
  },
  mapStopPillText: {
    ...Typography.bodySmall,
    color: C.text,
    fontWeight: '600' as const,
  },
  editMapBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: C.primaryFixed,
    borderRadius: Rounded.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 3,
  },
  editMapBadgeText: {
    ...Typography.caption,
    color: C.primary,
    fontWeight: '600' as const,
    fontSize: 11,
  },
  pickMapButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: C.primaryFixed,
    borderRadius: Rounded.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  pickMapButtonText: {
    ...Typography.caption,
    color: C.primary,
    fontWeight: '600' as const,
    fontSize: 11,
  },
  // Sticky footer
  stickyFooter: {
    position: 'absolute',
    bottom: TabBarHeight,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.gutter,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.outlineVariant,
  },
});
