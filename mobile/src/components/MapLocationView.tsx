import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Animated,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import MapView, { Marker, Polyline, Callout, PROVIDER_DEFAULT } from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Rounded, Shadow, Spacing, Typography } from '@/constants/theme';

const C = Colors.light;

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface MapMarkerItem {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  subtitle?: string;
  pinColor?: string;
  type?: 'start' | 'stop' | 'destination' | 'current' | 'poi';
  sequenceIndex?: number;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  durationMinutes?: number;
  address?: string;
}

export interface MapLocationViewProps {
  initialLocation?: Coordinates;
  markers?: MapMarkerItem[];
  routePolyline?: Coordinates[];
  height?: number | string;
  showControls?: boolean;
  expandable?: boolean;
  interactive?: boolean;
  onLocationChange?: (coords: Coordinates, address?: string) => void;
  onMarkerPress?: (markerId: string) => void;
  onMapPress?: (coords: Coordinates) => void;
}

// Modern desaturated map style matching Intelligent Mobility UI
const customMapStyle = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#f5f7fa' }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#525c75' }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#ffffff' }],
  },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#c7c4d7' }],
  },
  {
    featureType: 'landscape.man_made',
    elementType: 'geometry.fill',
    stylers: [{ color: '#edf2fa' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#e8edf6' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry.fill',
    stylers: [{ color: '#d4edda' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#dfe4ed' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.fill',
    stylers: [{ color: '#c3c0ff' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#4338ca' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry.fill',
    stylers: [{ color: '#d0e1fd' }],
  },
];

export default function MapLocationView({
  initialLocation,
  markers = [],
  routePolyline = [],
  height = 260,
  showControls = true,
  expandable = true,
  interactive = true,
  onLocationChange,
  onMarkerPress,
  onMapPress,
}: MapLocationViewProps) {
  const mapRef = useRef<MapView | null>(null);
  const fullMapRef = useRef<MapView | null>(null);

  // Default to Istanbul / Turkey center if GPS is fetching
  const [currentLocation, setCurrentLocation] = useState<Coordinates>(
    initialLocation ?? { latitude: 41.0082, longitude: 28.9784 }
  );
  const [hasGpsFix, setHasGpsFix] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<MapMarkerItem | null>(null);

  // Map Region State
  const [currentRegion, setCurrentRegion] = useState({
    latitude: currentLocation.latitude,
    longitude: currentLocation.longitude,
    latitudeDelta: 0.045,
    longitudeDelta: 0.045,
  });

  // Pulse animation for current location halo
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.timing(pulseAnim, {
          toValue: 2.2,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseOpacity, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Sync initial location
  useEffect(() => {
    if (initialLocation) {
      setCurrentLocation(initialLocation);
      setCurrentRegion((prev) => ({
        ...prev,
        latitude: initialLocation.latitude,
        longitude: initialLocation.longitude,
      }));
    }
  }, [initialLocation?.latitude, initialLocation?.longitude]);

  // Request real user GPS location
  useEffect(() => {
    let isMounted = true;
    let locationSubscription: any = null;

    async function fetchUserLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (isMounted) setIsLoading(false);
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (isMounted && location?.coords) {
          const coords = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          setCurrentLocation(coords);
          setHasGpsFix(true);
          setIsLoading(false);
          onLocationChange?.(coords);

          // Animate camera to user location if no custom markers are preset
          if (markers.length === 0 && mapRef.current) {
            mapRef.current.animateToRegion(
              {
                latitude: coords.latitude,
                longitude: coords.longitude,
                latitudeDelta: 0.035,
                longitudeDelta: 0.035,
              },
              800
            );
          }
        }

        // Live location updates
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 10000,
            distanceInterval: 15,
          },
          (loc) => {
            if (isMounted && loc?.coords) {
              const coords = {
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
              };
              setCurrentLocation(coords);
              setHasGpsFix(true);
              onLocationChange?.(coords);
            }
          }
        );
      } catch (err) {
        console.warn('MapLocationView - GPS fetch error:', err);
        if (isMounted) setIsLoading(false);
      }
    }

    fetchUserLocation();

    return () => {
      isMounted = false;
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  const handleCenterOnUser = useCallback(() => {
    const targetMap = isExpanded ? fullMapRef.current : mapRef.current;
    if (targetMap && currentLocation) {
      targetMap.animateToRegion(
        {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        800
      );
    }
  }, [isExpanded, currentLocation]);

  const handleFitAllMarkers = useCallback(() => {
    const targetMap = isExpanded ? fullMapRef.current : mapRef.current;
    const allCoords: Coordinates[] = [];

    if (currentLocation) allCoords.push(currentLocation);
    markers.forEach((m) => allCoords.push({ latitude: m.latitude, longitude: m.longitude }));
    if (routePolyline.length > 0) {
      allCoords.push(...routePolyline);
    }

    if (targetMap && allCoords.length > 1) {
      targetMap.fitToCoordinates(allCoords, {
        edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
        animated: true,
      });
    } else if (targetMap && currentLocation) {
      handleCenterOnUser();
    }
  }, [isExpanded, markers, routePolyline, currentLocation, handleCenterOnUser]);

  const handleZoom = useCallback(
    (zoomIn: boolean) => {
      const targetMap = isExpanded ? fullMapRef.current : mapRef.current;
      if (!targetMap) return;

      const factor = zoomIn ? 0.5 : 2.0;
      targetMap.animateToRegion(
        {
          latitude: currentRegion.latitude,
          longitude: currentRegion.longitude,
          latitudeDelta: Math.max(0.002, Math.min(80, currentRegion.latitudeDelta * factor)),
          longitudeDelta: Math.max(0.002, Math.min(80, currentRegion.longitudeDelta * factor)),
        },
        300
      );
    },
    [isExpanded, currentRegion]
  );

  const toggleMapType = () => {
    setMapType((prev) => (prev === 'standard' ? 'satellite' : 'standard'));
  };

  const handleMarkerClick = (marker: MapMarkerItem) => {
    setSelectedMarker(marker);
    onMarkerPress?.(marker.id);
  };

  // Render customized marker badge
  const renderCustomMarker = (m: MapMarkerItem, index: number) => {
    const isStart = m.type === 'start';
    const isDestination = m.type === 'destination';
    const seq = m.sequenceIndex !== undefined ? m.sequenceIndex + 1 : index + 1;

    let bgColor = C.primary;
    let iconName: keyof typeof MaterialIcons.glyphMap = 'place';
    let label = String(seq);

    if (isStart) {
      bgColor = C.secondary;
      iconName = 'navigation';
      label = 'A';
    } else if (isDestination) {
      bgColor = C.error;
      iconName = 'flag';
      label = 'B';
    } else if (m.priority === 'critical') {
      bgColor = C.error;
    } else if (m.priority === 'high') {
      bgColor = C.tertiary;
    }

    return (
      <Marker
        key={m.id || `marker_${index}`}
        coordinate={{ latitude: m.latitude, longitude: m.longitude }}
        title={m.title}
        description={m.subtitle || m.address}
        anchor={{ x: 0.5, y: 0.5 }}
        onPress={() => handleMarkerClick(m)}
      >
        <View style={styles.customMarkerWrapper}>
          <View style={[styles.customMarkerPin, { backgroundColor: bgColor }]}>
            {isStart || isDestination ? (
              <MaterialIcons name={iconName} size={14} color="#FFFFFF" />
            ) : (
              <Text style={styles.customMarkerText}>{label}</Text>
            )}
          </View>
          <View style={[styles.customMarkerArrow, { borderTopColor: bgColor }]} />
        </View>
      </Marker>
    );
  };

  // Render Inner Map Elements
  const renderMapContent = (refInstance: React.MutableRefObject<MapView | null>, isFull: boolean) => {
    return (
      <MapView
        ref={refInstance}
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        mapType={mapType}
        customMapStyle={mapType === 'standard' ? customMapStyle : undefined}
        initialRegion={currentRegion}
        onRegionChangeComplete={(region) => setCurrentRegion(region)}
        onPress={(e) => onMapPress?.(e.nativeEvent.coordinate)}
        showsCompass={isFull}
        showsBuildings={true}
        showsTraffic={false}
        rotateEnabled={true}
        pitchEnabled={isFull}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
      >
        {/* User Current Location Marker with Animated Ripple */}
        <Marker
          coordinate={currentLocation}
          title="Konumunuz"
          description="Mevcut GPS Konumunuz"
          anchor={{ x: 0.5, y: 0.5 }}
          zIndex={99}
        >
          <View style={styles.userMarkerContainer}>
            <Animated.View
              style={[
                styles.pulseHalo,
                {
                  transform: [{ scale: pulseAnim }],
                  opacity: pulseOpacity,
                },
              ]}
            />
            <View style={styles.userMarkerInner}>
              <View style={styles.userMarkerCore} />
            </View>
          </View>
        </Marker>

        {/* Dynamic Markers */}
        {markers.map((m, idx) => renderCustomMarker(m, idx))}

        {/* Route Polylines */}
        {routePolyline.length > 1 && (
          <Polyline
            coordinates={routePolyline}
            strokeColor={C.primary}
            strokeWidth={isFull ? 6 : 4}
            lineCap="round"
            lineJoin="round"
          />
        )}
      </MapView>
    );
  };

  return (
    <View style={[styles.container, { height: height as any }]}>
      {Platform.OS !== 'web' ? (
        <View style={StyleSheet.absoluteFill}>
          {renderMapContent(mapRef, false)}

          {/* Click to expand tap overlay when interactive & expandable */}
          {expandable && (
            <TouchableOpacity
              style={styles.expandHitArea}
              activeOpacity={0.9}
              onPress={() => setIsExpanded(true)}
              accessibilityLabel="Haritayı Tam Ekran Büyüt"
            >
              <View style={styles.expandBadge}>
                <MaterialIcons name="fullscreen" size={18} color={C.primary} />
                <Text style={styles.expandBadgeText}>Büyüt</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        /* Web fallback with styled map view */
        <TouchableOpacity
          style={styles.webFallback}
          activeOpacity={expandable ? 0.9 : 1}
          onPress={() => expandable && setIsExpanded(true)}
        >
          <View style={styles.webMapBackground}>
            <View style={styles.webRoad1} />
            <View style={styles.webRoad2} />
            <View style={styles.webPark} />

            {/* Markers on Web */}
            {markers.map((m, idx) => (
              <View
                key={m.id || idx}
                style={[
                  styles.webMarkerPill,
                  {
                    left: `${25 + (idx % 3) * 25}%`,
                    top: `${30 + (idx % 2) * 25}%`,
                    backgroundColor: m.type === 'start' ? C.secondary : C.primary,
                  },
                ]}
              >
                <Text style={styles.webMarkerPillText}>{m.type === 'start' ? 'A' : idx + 1}</Text>
              </View>
            ))}

            {/* User pulse marker */}
            <View style={styles.webUserMarkerWrapper}>
              <Animated.View
                style={[
                  styles.pulseHalo,
                  {
                    transform: [{ scale: pulseAnim }],
                    opacity: pulseOpacity,
                  },
                ]}
              />
              <View style={styles.userMarkerInner}>
                <View style={styles.userMarkerCore} />
              </View>
              <View style={styles.webLocationBadge}>
                <Text style={styles.webLocationText}>Mevcut Konumunuz</Text>
                <Text style={styles.webCoordsText}>
                  {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
                </Text>
              </View>
            </View>
          </View>

          {expandable && (
            <View style={styles.webExpandBadge}>
              <MaterialIcons name="fullscreen" size={18} color={C.primary} />
              <Text style={styles.expandBadgeText}>Haritayı Büyüt</Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Top and Bottom Gradients for Sleek Design Blend */}
      <View style={styles.topGradient} pointerEvents="none" />
      <View style={styles.bottomGradient} pointerEvents="none" />

      {/* Floating Map Actions (Inline mode) */}
      {showControls && (
        <View style={styles.floatingControls}>
          <TouchableOpacity
            style={styles.floatingBtn}
            activeOpacity={0.8}
            onPress={handleCenterOnUser}
            accessibilityRole="button"
            accessibilityLabel="Mevcut konuma odaklan"
          >
            <MaterialIcons
              name="my-location"
              size={20}
              color={hasGpsFix ? C.primary : C.textSecondary}
            />
          </TouchableOpacity>

          {markers.length > 0 && (
            <TouchableOpacity
              style={styles.floatingBtn}
              activeOpacity={0.8}
              onPress={handleFitAllMarkers}
              accessibilityRole="button"
              accessibilityLabel="Tüm rotayı göster"
            >
              <MaterialIcons name="route" size={20} color={C.secondary} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.floatingBtn}
            activeOpacity={0.8}
            onPress={toggleMapType}
            accessibilityRole="button"
            accessibilityLabel="Harita katmanını değiştir"
          >
            <MaterialIcons
              name={mapType === 'standard' ? 'layers' : 'map'}
              size={20}
              color={C.textSecondary}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingPill}>
          <ActivityIndicator size="small" color={C.primary} />
          <Text style={styles.loadingText}>Konum alınıyor...</Text>
        </View>
      )}

      {/* ========================================================================= */}
      {/* FULLSCREEN EXPANDED MAP MODAL */}
      {/* ========================================================================= */}
      <Modal
        visible={isExpanded}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setIsExpanded(false)}
      >
        <SafeAreaView style={styles.modalSafeArea} edges={['top', 'bottom']}>
          {/* Fullscreen Map View */}
          <View style={styles.modalMapWrapper}>
            {Platform.OS !== 'web' ? (
              renderMapContent(fullMapRef, true)
            ) : (
              <View style={styles.webFallback}>
                <View style={styles.webMapBackground}>
                  <View style={styles.webRoad1} />
                  <View style={styles.webRoad2} />
                  <View style={styles.webPark} />
                  <View style={styles.webUserMarkerWrapper}>
                    <View style={styles.userMarkerInner}>
                      <View style={styles.userMarkerCore} />
                    </View>
                    <View style={styles.webLocationBadge}>
                      <Text style={styles.webLocationText}>Tam Ekran Harita Görünümü</Text>
                      <Text style={styles.webCoordsText}>
                        {markers.length} Nokta / Durak İşaretlendi
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Top Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.modalBackBtn}
                onPress={() => setIsExpanded(false)}
                activeOpacity={0.8}
              >
                <MaterialIcons name="close" size={22} color={C.text} />
              </TouchableOpacity>

              <View style={styles.modalTitleBox}>
                <Text style={styles.modalTitle}>Detaylı Rota Haritası</Text>
                <Text style={styles.modalSubtitle}>
                  {markers.length > 0
                    ? `${markers.length} Konum / Durak Belirlendi`
                    : 'Konumunuz & Çevre'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalHeaderAction}
                onPress={handleFitAllMarkers}
                activeOpacity={0.8}
              >
                <MaterialIcons name="crop-free" size={20} color={C.primary} />
              </TouchableOpacity>
            </View>

            {/* Fullscreen Map Controls Toolbar */}
            <View style={styles.fullControls}>
              <TouchableOpacity
                style={styles.fullBtn}
                activeOpacity={0.8}
                onPress={() => handleZoom(true)}
              >
                <MaterialIcons name="add" size={22} color={C.text} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.fullBtn}
                activeOpacity={0.8}
                onPress={() => handleZoom(false)}
              >
                <MaterialIcons name="remove" size={22} color={C.text} />
              </TouchableOpacity>

              <View style={styles.fullDivider} />

              <TouchableOpacity
                style={styles.fullBtn}
                activeOpacity={0.8}
                onPress={handleCenterOnUser}
              >
                <MaterialIcons
                  name="my-location"
                  size={20}
                  color={hasGpsFix ? C.primary : C.textSecondary}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.fullBtn}
                activeOpacity={0.8}
                onPress={handleFitAllMarkers}
              >
                <MaterialIcons name="alt-route" size={20} color={C.secondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.fullBtn}
                activeOpacity={0.8}
                onPress={toggleMapType}
              >
                <MaterialIcons
                  name={mapType === 'standard' ? 'layers' : 'map'}
                  size={20}
                  color={C.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {/* Selected Marker Detail Card (Bottom Float) */}
            {selectedMarker && (
              <View style={styles.selectedCard}>
                <View style={styles.selectedHeader}>
                  <View
                    style={[
                      styles.selectedBadge,
                      {
                        backgroundColor:
                          selectedMarker.type === 'start'
                            ? C.secondaryContainer
                            : selectedMarker.type === 'destination'
                            ? C.errorContainer
                            : C.primaryFixed,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name={
                        selectedMarker.type === 'start'
                          ? 'navigation'
                          : selectedMarker.type === 'destination'
                          ? 'flag'
                          : 'place'
                      }
                      size={18}
                      color={
                        selectedMarker.type === 'start'
                          ? C.secondary
                          : selectedMarker.type === 'destination'
                          ? C.error
                          : C.primary
                      }
                    />
                    <Text
                      style={[
                        styles.selectedBadgeText,
                        {
                          color:
                            selectedMarker.type === 'start'
                              ? C.secondary
                              : selectedMarker.type === 'destination'
                              ? C.error
                              : C.primary,
                        },
                      ]}
                    >
                      {selectedMarker.type === 'start'
                        ? 'Başlangıç Noktası'
                        : selectedMarker.type === 'destination'
                        ? 'Hedef Noktası'
                        : `Durak #${(selectedMarker.sequenceIndex ?? 0) + 1}`}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => setSelectedMarker(null)}
                    style={styles.selectedClose}
                  >
                    <MaterialIcons name="close" size={18} color={C.outline} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.selectedTitle} numberOfLines={1}>
                  {selectedMarker.title}
                </Text>

                {selectedMarker.address && (
                  <Text style={styles.selectedAddress} numberOfLines={2}>
                    {selectedMarker.address}
                  </Text>
                )}

                <View style={styles.selectedMetaRow}>
                  {selectedMarker.durationMinutes && (
                    <View style={styles.selectedMetaItem}>
                      <MaterialIcons name="schedule" size={14} color={C.textSecondary} />
                      <Text style={styles.selectedMetaText}>
                        {selectedMarker.durationMinutes} dakika mola
                      </Text>
                    </View>
                  )}
                  {selectedMarker.priority && (
                    <View style={styles.selectedMetaItem}>
                      <MaterialIcons name="flag" size={14} color={C.textSecondary} />
                      <Text style={styles.selectedMetaText}>
                        Öncelik: {selectedMarker.priority}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    backgroundColor: C.surfaceContainerLow,
    overflow: 'hidden',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  expandHitArea: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    zIndex: 15,
  },
  expandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Rounded.full,
    gap: 4,
    ...Shadow.md,
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  expandBadgeText: {
    ...Typography.caption,
    fontWeight: '700',
    color: C.primary,
  },
  webExpandBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Rounded.full,
    gap: 4,
    ...Shadow.md,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    zIndex: 5,
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 36,
    backgroundColor: 'rgba(249, 249, 255, 0.3)',
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 48,
    backgroundColor: 'rgba(249, 249, 255, 0.4)',
  },
  // User location marker
  userMarkerContainer: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseHalo: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.primary,
  },
  userMarkerInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
    borderWidth: 2,
    borderColor: C.primary,
  },
  userMarkerCore: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.primary,
  },
  // Custom marker pin
  customMarkerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  customMarkerPin: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  customMarkerArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
  customMarkerText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  // Floating controls
  floatingControls: {
    position: 'absolute',
    right: Spacing.sm,
    bottom: Spacing.sm,
    gap: Spacing.xs,
    zIndex: 10,
  },
  floatingBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  // Loading state
  loadingPill: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Rounded.full,
    ...Shadow.sm,
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  loadingText: {
    ...Typography.caption,
    color: C.textSecondary,
    fontWeight: '600',
  },
  // Web fallback styles
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
    top: '40%',
    left: 0,
    right: 0,
    height: 16,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '-8deg' }],
  },
  webRoad2: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '55%',
    width: 16,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '15deg' }],
  },
  webPark: {
    position: 'absolute',
    top: '15%',
    left: '10%',
    width: 120,
    height: 90,
    backgroundColor: '#D1EAD7',
    borderRadius: 16,
  },
  webUserMarkerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  webLocationBadge: {
    backgroundColor: C.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Rounded.lg,
    marginTop: 8,
    alignItems: 'center',
    ...Shadow.md,
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  webLocationText: {
    ...Typography.caption,
    color: C.primary,
    fontWeight: '700',
  },
  webCoordsText: {
    fontSize: 11,
    color: C.textSecondary,
  },
  webMarkerPill: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  webMarkerPillText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
  },
  // Modal Fullscreen Styles
  modalSafeArea: {
    flex: 1,
    backgroundColor: C.background,
  },
  modalMapWrapper: {
    flex: 1,
    position: 'relative',
  },
  modalHeader: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: Rounded.xl,
    padding: Spacing.sm,
    gap: Spacing.sm,
    ...Shadow.lg,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    zIndex: 20,
  },
  modalBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitleBox: {
    flex: 1,
  },
  modalTitle: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    color: C.text,
  },
  modalSubtitle: {
    ...Typography.caption,
    color: C.textSecondary,
    fontSize: 11,
  },
  modalHeaderAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullControls: {
    position: 'absolute',
    right: Spacing.base,
    bottom: Spacing['3xl'] + 20,
    backgroundColor: C.surface,
    borderRadius: Rounded.xl,
    padding: 4,
    gap: 4,
    ...Shadow.lg,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    zIndex: 20,
  },
  fullBtn: {
    width: 44,
    height: 44,
    borderRadius: Rounded.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullDivider: {
    height: 1,
    backgroundColor: C.outlineVariant,
    marginHorizontal: 4,
  },
  // Selected Card (Bottom Sheet Floating)
  selectedCard: {
    position: 'absolute',
    bottom: Spacing.base,
    left: Spacing.base,
    right: Spacing.base,
    backgroundColor: C.surface,
    borderRadius: Rounded['2xl'],
    padding: Spacing.base,
    gap: Spacing.xs,
    ...Shadow.xl,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    zIndex: 25,
  },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: Rounded.full,
    gap: 4,
  },
  selectedBadgeText: {
    ...Typography.caption,
    fontWeight: '700',
    fontSize: 11,
  },
  selectedClose: {
    padding: 4,
  },
  selectedTitle: {
    ...Typography.h4,
    color: C.text,
  },
  selectedAddress: {
    ...Typography.caption,
    color: C.textSecondary,
    lineHeight: 16,
  },
  selectedMetaRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: 4,
  },
  selectedMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selectedMetaText: {
    ...Typography.caption,
    color: C.textSecondary,
    fontWeight: '500',
  },
});

