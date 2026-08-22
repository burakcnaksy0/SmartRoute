import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform,
  Animated,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Rounded, Shadow, Spacing, Typography } from '@/constants/theme';
import { placesApi, PlaceResult } from '@/api/places';
import { useSavedLocationStore } from '../store/savedLocationStore';

const C = Colors.light;

export interface PickedLocationResult {
  latitude: number;
  longitude: number;
  address: string;
  placeName: string;
}

export interface MapLocationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectLocation: (result: PickedLocationResult) => void;
  title?: string;
  mode?: 'start' | 'destination' | 'stop';
  initialCoordinates?: { latitude: number; longitude: number };
  initialAddress?: string;
  existingMarkers?: Array<{
    id: string;
    latitude: number;
    longitude: number;
    title: string;
    type?: 'start' | 'stop' | 'destination';
  }>;
}

export default function MapLocationPickerModal({
  visible,
  onClose,
  onSelectLocation,
  title,
  mode = 'stop',
  initialCoordinates,
  initialAddress,
  existingMarkers = [],
}: MapLocationPickerModalProps) {
  const mapRef = useRef<MapView | null>(null);
  const insets = useSafeAreaInsets();

  // Selected Pin Coordinates
  const [selectedCoords, setSelectedCoords] = useState<{ latitude: number; longitude: number }>(
    initialCoordinates ?? { latitude: 41.0082, longitude: 28.9784 }
  );
  const [selectedAddress, setSelectedAddress] = useState<string>(initialAddress ?? '');
  const [selectedPlaceName, setSelectedPlaceName] = useState<string>(
    initialAddress ? initialAddress.split(',')[0] : 'Seçilen Konum'
  );
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  // Search input & dropdown autocomplete
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Custom name input (ROUTE-004 / STOP-001)
  const [customName, setCustomName] = useState('');

  // GPS and Map type
  const [hasGps, setHasGps] = useState(false);
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');
  const [userGpsCoords, setUserGpsCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  // Modal title and button label based on mode
  const modalTitle =
    title ??
    (mode === 'start'
      ? 'Başlangıç Konumu Seç'
      : mode === 'destination'
      ? 'Hedef Konumu Seç'
      : 'Haritadan Durak Seç');

  const actionButtonLabel =
    mode === 'start'
      ? 'Başlangıç Olarak Belirle'
      : mode === 'destination'
      ? 'Hedef Olarak Seç'
      : 'Durak Olarak Ekle';

  // Pulse animation for pin drop
  const pinBounceAnim = useRef(new Animated.Value(0)).current;

  const triggerPinBounce = () => {
    pinBounceAnim.setValue(-12);
    Animated.spring(pinBounceAnim, {
      toValue: 0,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  // Sync initial coordinates when modal opens
  useEffect(() => {
    if (visible) {
      if (initialCoordinates) {
        setSelectedCoords(initialCoordinates);
        if (initialAddress) {
          setSelectedAddress(initialAddress);
          setSelectedPlaceName(initialAddress.split(',')[0]);
        } else {
          reverseGeocodeCoords(initialCoordinates.latitude, initialCoordinates.longitude);
        }
      } else {
        requestUserLocation();
      }
    }
  }, [visible, initialCoordinates?.latitude, initialCoordinates?.longitude]);

  // Request GPS position
  const requestUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      if (location?.coords) {
        const coords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        setUserGpsCoords(coords);
        setHasGps(true);

        if (!initialCoordinates) {
          setSelectedCoords(coords);
          reverseGeocodeCoords(coords.latitude, coords.longitude);
          if (mapRef.current) {
            mapRef.current.animateToRegion(
              {
                latitude: coords.latitude,
                longitude: coords.longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              },
              600
            );
          }
        }
      }
    } catch (e) {
      console.warn('MapLocationPickerModal GPS error:', e);
    }
  };

  // Reverse geocode with debouncing
  const reverseGeocodeCoords = async (lat: number, lng: number) => {
    setIsReverseGeocoding(true);
    try {
      const address = await placesApi.reverseGeocode(lat, lng);
      if (address) {
        setSelectedAddress(address);
        const namePart = address.split(',')[0]?.trim();
        setSelectedPlaceName(namePart || 'Seçilen Konum');
      } else {
        setSelectedAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        setSelectedPlaceName('Harita Konumu');
      }
    } catch {
      setSelectedAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      setSelectedPlaceName('Harita Konumu');
    } finally {
      setIsReverseGeocoding(false);
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
        console.warn('Picker search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle map tap to place pin
  const handleMapPress = (coords: { latitude: number; longitude: number }) => {
    setSelectedCoords(coords);
    triggerPinBounce();
    reverseGeocodeCoords(coords.latitude, coords.longitude);
  };

  // Handle place selection from search dropdown
  const handleSelectSearchResult = (place: PlaceResult) => {
    setShowSearchResults(false);
    setSearchQuery('');
    const newCoords = { latitude: place.lat, longitude: place.lng };
    setSelectedCoords(newCoords);
    setSelectedPlaceName(place.name);
    setSelectedAddress(place.vicinity || place.name);
    triggerPinBounce();

    if (mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: place.lat,
          longitude: place.lng,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        },
        700
      );
    }
  };

  // Center on User GPS
  const handleCenterOnUser = () => {
    if (userGpsCoords && mapRef.current) {
      setSelectedCoords(userGpsCoords);
      reverseGeocodeCoords(userGpsCoords.latitude, userGpsCoords.longitude);
      triggerPinBounce();
      mapRef.current.animateToRegion(
        {
          latitude: userGpsCoords.latitude,
          longitude: userGpsCoords.longitude,
          latitudeDelta: 0.018,
          longitudeDelta: 0.018,
        },
        600
      );
    } else {
      requestUserLocation();
    }
  };

  // Zoom buttons
  const handleZoom = (zoomIn: boolean) => {
    if (!mapRef.current) return;
    mapRef.current.getCamera().then((camera) => {
      if (camera) {
        const factor = zoomIn ? 0.5 : 2.0;
        mapRef.current?.animateToRegion(
          {
            latitude: selectedCoords.latitude,
            longitude: selectedCoords.longitude,
            latitudeDelta: 0.02 * factor,
            longitudeDelta: 0.02 * factor,
          },
          300
        );
      }
    });
  };

  // Confirm selection
  const handleConfirm = () => {
    const finalPlaceName = customName.trim() || selectedPlaceName || 'Seçilen Konum';
    onSelectLocation({
      latitude: selectedCoords.latitude,
      longitude: selectedCoords.longitude,
      address: selectedAddress || `${selectedCoords.latitude.toFixed(4)}, ${selectedCoords.longitude.toFixed(4)}`,
      placeName: finalPlaceName,
    });
    setCustomName('');
    onClose();
  };

  const handleSaveToFavorites = async () => {
    const finalPlaceName = customName.trim() || selectedPlaceName || 'Seçilen Konum';
    const address = selectedAddress || `${selectedCoords.latitude.toFixed(4)}, ${selectedCoords.longitude.toFixed(4)}`;
    const success = await useSavedLocationStore.getState().saveLocation(
      finalPlaceName,
      selectedCoords.latitude,
      selectedCoords.longitude,
      address,
      'favorite'
    );
    if (success) {
      alert('Konum kaydedildi!');
    } else {
      alert('Kaydedilemedi: ' + useSavedLocationStore.getState().error);
    }
  };

  const getMarkerColor = () => {
    if (mode === 'start') return C.secondary;
    if (mode === 'destination') return C.error;
    return C.primary;
  };

  const getMarkerIcon = (): keyof typeof MaterialIcons.glyphMap => {
    if (mode === 'start') return 'navigation';
    if (mode === 'destination') return 'flag';
    return 'place';
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.safeArea, { paddingTop: Platform.OS === 'android' ? insets.top : 0 }]}>
        {/* Top Floating Search & Header Bar */}
        <View style={styles.topContainer}>
          <View style={styles.headerBar}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
              <MaterialIcons name="arrow-back" size={22} color={C.text} />
            </TouchableOpacity>

            <View style={styles.headerTitleBox}>
              <Text style={styles.headerTitle}>{modalTitle}</Text>
              <Text style={styles.headerSubtitle}>Haritaya dokunarak veya arayarak konum belirleyin</Text>
            </View>
          </View>

          {/* Search Input */}
          <View style={styles.searchBar}>
            <MaterialIcons name="search" size={20} color={C.primary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Adres, cadde veya mekan ara..."
              placeholderTextColor={C.outline}
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                setShowSearchResults(text.length > 0);
              }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  setShowSearchResults(false);
                }}
              >
                <MaterialIcons name="close" size={18} color={C.outline} />
              </TouchableOpacity>
            )}
          </View>

          {/* Autocomplete Search Dropdown */}
          {showSearchResults && (
            <View style={styles.dropdownResults}>
              {isSearching ? (
                <View style={styles.searchLoading}>
                  <ActivityIndicator size="small" color={C.primary} />
                  <Text style={styles.searchLoadingText}>Sonuçlar aranıyor...</Text>
                </View>
              ) : searchResults.length > 0 ? (
                <ScrollView style={{ maxHeight: 220 }} keyboardShouldPersistTaps="handled">
                  {searchResults.map((place, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.resultItem}
                      onPress={() => handleSelectSearchResult(place)}
                    >
                      <MaterialIcons name="place" size={18} color={C.primary} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.resultItemName} numberOfLines={1}>
                          {place.name}
                        </Text>
                        {place.vicinity && (
                          <Text style={styles.resultItemAddress} numberOfLines={1}>
                            {place.vicinity}
                          </Text>
                        )}
                      </View>
                      <MaterialIcons name="north-west" size={16} color={C.outline} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.noResultsBox}>
                  <Text style={styles.noResultsText}>Adres bulunamadı</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Map Container */}
        <View style={styles.mapWrapper}>
          {Platform.OS !== 'web' ? (
            <MapView
              ref={mapRef}
              provider={PROVIDER_DEFAULT}
              style={styles.map}
              mapType={mapType}
              initialRegion={{
                latitude: selectedCoords.latitude,
                longitude: selectedCoords.longitude,
                latitudeDelta: 0.025,
                longitudeDelta: 0.025,
              }}
              onPress={(e) => handleMapPress(e.nativeEvent.coordinate)}
              showsCompass={false}
              showsBuildings={true}
              showsUserLocation={true}
              rotateEnabled={true}
            >
              {/* Existing Markers (Context on map) */}
              {existingMarkers.map((m) => (
                <Marker
                  key={m.id}
                  coordinate={{ latitude: m.latitude, longitude: m.longitude }}
                  title={m.title}
                  opacity={0.65}
                  pinColor={m.type === 'start' ? C.secondary : m.type === 'destination' ? C.error : C.primary}
                />
              ))}

              {/* Selected Interactive Pin */}
              <Marker
                coordinate={selectedCoords}
                anchor={{ x: 0.5, y: 1.0 }}
                zIndex={999}
              >
                <Animated.View
                  style={[
                    styles.pinMarkerContainer,
                    { transform: [{ translateY: pinBounceAnim }] },
                  ]}
                >
                  <View style={[styles.pinBadge, { backgroundColor: getMarkerColor() }]}>
                    <MaterialIcons name={getMarkerIcon()} size={18} color="#FFFFFF" />
                  </View>
                  <View style={[styles.pinPoint, { borderTopColor: getMarkerColor() }]} />
                  <View style={styles.pinShadow} />
                </Animated.View>
              </Marker>
            </MapView>
          ) : (
            /* Web Fallback with interactive click */
            <TouchableOpacity
              style={styles.webFallback}
              activeOpacity={1}
              onPress={(e) => {
                const target = e.currentTarget as any;
                // Mock coordinate shift
                handleMapPress({
                  latitude: selectedCoords.latitude + (Math.random() - 0.5) * 0.005,
                  longitude: selectedCoords.longitude + (Math.random() - 0.5) * 0.005,
                });
              }}
            >
              <View style={styles.webMapBackground}>
                <View style={styles.webRoad1} />
                <View style={styles.webRoad2} />
                <View style={styles.webPark} />

                {/* Selected Pin */}
                <View style={styles.webPinWrapper}>
                  <View style={[styles.pinBadge, { backgroundColor: getMarkerColor() }]}>
                    <MaterialIcons name={getMarkerIcon()} size={18} color="#FFFFFF" />
                  </View>
                  <View style={[styles.pinPoint, { borderTopColor: getMarkerColor() }]} />
                </View>
              </View>
              <View style={styles.webTapHint}>
                <Text style={styles.webTapHintText}>Haritada konumu değiştirmek için tıklayın</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Floating Map Controls */}
          <View style={styles.floatingControls}>
            <TouchableOpacity
              style={styles.controlBtn}
              activeOpacity={0.8}
              onPress={() => handleZoom(true)}
            >
              <MaterialIcons name="add" size={20} color={C.text} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlBtn}
              activeOpacity={0.8}
              onPress={() => handleZoom(false)}
            >
              <MaterialIcons name="remove" size={20} color={C.text} />
            </TouchableOpacity>

            <View style={styles.controlDivider} />

            <TouchableOpacity
              style={styles.controlBtn}
              activeOpacity={0.8}
              onPress={handleCenterOnUser}
            >
              <MaterialIcons
                name="my-location"
                size={20}
                color={hasGps ? C.primary : C.textSecondary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlBtn}
              activeOpacity={0.8}
              onPress={() => setMapType((p) => (p === 'standard' ? 'satellite' : 'standard'))}
            >
              <MaterialIcons
                name={mapType === 'standard' ? 'layers' : 'map'}
                size={20}
                color={C.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Hint Overlay Banner */}
          <View style={styles.instructionBadge}>
            <MaterialIcons name="touch-app" size={16} color={C.primary} />
            <Text style={styles.instructionText}>
              Haritada istediğiniz noktaya dokunarak pini konumlandırın
            </Text>
          </View>
        </View>

        {/* Bottom Location Confirmation Sheet */}
        <View style={[styles.bottomCard, { paddingBottom: Math.max(Spacing.md, insets.bottom) }]}>
          <View style={styles.locationHeaderRow}>
            <View style={[styles.locationIconCircle, { backgroundColor: getMarkerColor() + '20' }]}>
              <MaterialIcons name={getMarkerIcon()} size={22} color={getMarkerColor()} />
            </View>

            <View style={{ flex: 1 }}>
              {isReverseGeocoding ? (
                <View style={styles.geocodingRow}>
                  <ActivityIndicator size="small" color={C.primary} />
                  <Text style={styles.geocodingText}>Adres belirleniyor...</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.locationTitle} numberOfLines={1}>
                    {selectedPlaceName}
                  </Text>
                  <Text style={styles.locationAddress} numberOfLines={2}>
                    {selectedAddress}
                  </Text>
                </>
              )}
            </View>
          </View>

          <View style={styles.coordsRow}>
            <Text style={styles.coordsText}>
              Koordinat: {selectedCoords.latitude.toFixed(5)}° N, {selectedCoords.longitude.toFixed(5)}° E
            </Text>
          </View>

          {/* Custom Name Input (ROUTE-004 / STOP-001) */}
          <View style={styles.customNameRow}>
            <MaterialIcons name="edit" size={16} color={C.textSecondary} />
            <TextInput
              style={styles.customNameInput}
              placeholder="Bu konuma özel isim verin (opsiyonel)"
              placeholderTextColor={C.outline}
              value={customName}
              onChangeText={setCustomName}
              maxLength={60}
              returnKeyType="done"
            />
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.favoriteBtn}
              activeOpacity={0.7}
              onPress={handleSaveToFavorites}
            >
              <MaterialIcons name="bookmark-border" size={24} color={getMarkerColor()} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: getMarkerColor() }]}
              activeOpacity={0.85}
              onPress={handleConfirm}
            >
              <MaterialIcons name="check-circle" size={20} color="#FFFFFF" />
              <Text style={styles.confirmBtnText}>{actionButtonLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.background,
  },
  topContainer: {
    paddingHorizontal: Spacing.gutter,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.outlineVariant,
    zIndex: 30,
    gap: Spacing.sm,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleBox: {
    flex: 1,
  },
  headerTitle: {
    ...Typography.h4,
    color: C.text,
  },
  headerSubtitle: {
    ...Typography.caption,
    color: C.textSecondary,
    fontSize: 11,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surfaceLow,
    borderRadius: Rounded.xl,
    paddingHorizontal: Spacing.md,
    height: 44,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  searchInput: {
    ...Typography.bodyMedium,
    color: C.text,
    flex: 1,
    padding: 0,
  },
  dropdownResults: {
    position: 'absolute',
    top: 105,
    left: Spacing.gutter,
    right: Spacing.gutter,
    backgroundColor: C.surface,
    borderRadius: Rounded.xl,
    ...Shadow.xl,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    overflow: 'hidden',
    zIndex: 50,
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
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.outlineVariant,
  },
  resultItemName: {
    ...Typography.bodyMedium,
    fontWeight: '600',
    color: C.text,
  },
  resultItemAddress: {
    ...Typography.caption,
    color: C.textSecondary,
    marginTop: 1,
  },
  noResultsBox: {
    padding: Spacing.base,
    alignItems: 'center',
  },
  noResultsText: {
    ...Typography.caption,
    color: C.textSecondary,
  },
  mapWrapper: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  instructionBadge: {
    position: 'absolute',
    top: Spacing.sm,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Rounded.full,
    gap: 6,
    ...Shadow.md,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    zIndex: 10,
  },
  instructionText: {
    ...Typography.caption,
    fontWeight: '600',
    color: C.text,
  },
  floatingControls: {
    position: 'absolute',
    right: Spacing.base,
    top: Spacing.sm,
    backgroundColor: C.surface,
    borderRadius: Rounded.xl,
    padding: 4,
    gap: 4,
    ...Shadow.lg,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    zIndex: 20,
  },
  controlBtn: {
    width: 40,
    height: 40,
    borderRadius: Rounded.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlDivider: {
    height: 1,
    backgroundColor: C.outlineVariant,
    marginHorizontal: 4,
  },
  // Custom pin
  pinMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.lg,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  pinPoint: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -2,
  },
  pinShadow: {
    width: 10,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.25)',
    marginTop: 2,
  },
  // Bottom Confirmation Sheet
  bottomCard: {
    backgroundColor: C.surface,
    borderTopLeftRadius: Rounded['2xl'],
    borderTopRightRadius: Rounded['2xl'],
    padding: Spacing.gutter,
    paddingBottom: Platform.OS === 'ios' ? Spacing.base : Spacing.gutter,
    gap: Spacing.md,
    ...Shadow.xl,
    borderTopWidth: 1,
    borderTopColor: C.outlineVariant,
    zIndex: 35,
  },
  locationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  locationIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationTitle: {
    ...Typography.h4,
    color: C.text,
  },
  locationAddress: {
    ...Typography.caption,
    color: C.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  geocodingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  geocodingText: {
    ...Typography.caption,
    color: C.textSecondary,
  },
  coordsRow: {
    backgroundColor: C.surfaceLow,
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: Rounded.md,
    alignSelf: 'flex-start',
  },
  coordsText: {
    ...Typography.caption,
    color: C.textSecondary,
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Rounded.xl,
    gap: Spacing.sm,
    ...Shadow.primary,
  },
  confirmBtnText: {
    ...Typography.button,
    color: '#FFFFFF',
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'center',
  },
  // Web Fallback
  webFallback: {
    flex: 1,
    backgroundColor: '#EAF0F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webMapBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#EBF2FC',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  webRoad1: {
    position: 'absolute',
    top: '45%',
    left: 0,
    right: 0,
    height: 20,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '-6deg' }],
  },
  webRoad2: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 20,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '12deg' }],
  },
  webPark: {
    position: 'absolute',
    top: '20%',
    left: '15%',
    width: 140,
    height: 100,
    backgroundColor: '#D1EAD7',
    borderRadius: 20,
  },
  webPinWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  webTapHint: {
    position: 'absolute',
    bottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: Rounded.full,
    ...Shadow.md,
  },
  webTapHintText: {
    ...Typography.caption,
    fontWeight: '600',
    color: C.primary,
  },
  customNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: C.surfaceLow,
    borderRadius: Rounded.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    marginTop: Spacing.xs,
  },
  customNameInput: {
    flex: 1,
    ...Typography.bodySmall,
    color: C.text,
    padding: 0,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  favoriteBtn: {
    width: 48,
    height: 48,
    borderRadius: Rounded.xl,
    backgroundColor: C.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
});
