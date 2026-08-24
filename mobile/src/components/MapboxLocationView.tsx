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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import Mapbox from '@rnmapbox/maps';
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
  autoCenterOnInitialLocation?: boolean;
}

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
  autoCenterOnInitialLocation = false,
}: MapLocationViewProps) {
  const cameraRef = useRef<Mapbox.Camera>(null);
  const fullCameraRef = useRef<Mapbox.Camera>(null);
  const insets = useSafeAreaInsets();

  const [currentLocation, setCurrentLocation] = useState<Coordinates>(
    initialLocation ?? { latitude: 41.0082, longitude: 28.9784 }
  );
  const [hasGpsFix, setHasGpsFix] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [mapStyle, setMapStyle] = useState(Mapbox.StyleURL.Street);

  useEffect(() => {
    if (initialLocation) {
      setCurrentLocation(initialLocation);
    }
  }, [initialLocation?.latitude, initialLocation?.longitude]);

  useEffect(() => {
    let locationSubscription: any = null;

    async function fetchUserLocation() {
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
          setCurrentLocation(coords);
          setHasGpsFix(true);
          onLocationChange?.(coords);
        }

        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 10000,
            distanceInterval: 15,
          },
          (loc) => {
            if (loc?.coords) {
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
      }
    }
    fetchUserLocation();
    return () => {
      if (locationSubscription) locationSubscription.remove();
    };
  }, []);

  const handleCenterOnUser = useCallback(() => {
    const cam = isExpanded ? fullCameraRef.current : cameraRef.current;
    if (cam && currentLocation) {
      cam.setCamera({
        centerCoordinate: [currentLocation.longitude, currentLocation.latitude],
        zoomLevel: 14,
        animationDuration: 1000,
        pitch: 45, // 3D effect
      });
    }
  }, [isExpanded, currentLocation]);

  const toggleMapType = () => {
    setMapStyle((prev) =>
      prev === Mapbox.StyleURL.Street ? Mapbox.StyleURL.Satellite : Mapbox.StyleURL.Street
    );
  };

  const polylineFeature = routePolyline.length > 1 ? {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: routePolyline.map((c) => [c.longitude, c.latitude]),
        },
      },
    ],
  } : null;

  const renderMap = (camRef: React.RefObject<Mapbox.Camera>, isFull: boolean) => (
    <Mapbox.MapView 
      style={styles.map} 
      styleURL={mapStyle}
      pitchEnabled={isFull}
      rotateEnabled={isFull}
      scrollEnabled={interactive}
      zoomEnabled={interactive}
      logoEnabled={false}
      attributionEnabled={false}
      onPress={(e) => {
        if (e.geometry && e.geometry.type === 'Point') {
          onMapPress?.({
            longitude: e.geometry.coordinates[0],
            latitude: e.geometry.coordinates[1],
          });
        }
      }}
    >
      <Mapbox.Camera
        ref={camRef}
        defaultSettings={{
          centerCoordinate: [currentLocation.longitude, currentLocation.latitude],
          zoomLevel: 12,
          pitch: isFull ? 45 : 0, // Enable 3D pitch on full screen
        }}
        animationDuration={1000}
        animationMode="flyTo"
      />
      
      {/* Native Mapbox User Location */}
      <Mapbox.UserLocation visible={true} showsUserHeadingIndicator={true} />

      {/* Dynamic Markers */}
      {markers.map((m, idx) => (
        <Mapbox.PointAnnotation
          key={m.id || `marker_${idx}`}
          id={m.id || `marker_${idx}`}
          coordinate={[m.longitude, m.latitude]}
          onSelected={() => onMarkerPress?.(m.id)}
        >
          <View style={[styles.customMarkerPin, { backgroundColor: m.pinColor || C.primary }]}>
             <Text style={styles.customMarkerText}>{m.type === 'start' ? 'A' : idx + 1}</Text>
          </View>
        </Mapbox.PointAnnotation>
      ))}

      {/* Route Polyline */}
      {polylineFeature && (
        <Mapbox.ShapeSource id="routeSource" shape={polylineFeature as any}>
          <Mapbox.LineLayer
            id="routeLayer"
            style={{
              lineColor: '#3B35D0', // SmartRoute Primary
              lineWidth: isFull ? 6 : 4,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        </Mapbox.ShapeSource>
      )}
    </Mapbox.MapView>
  );

  return (
    <View style={[styles.container, { height: height as any }]}>
      {Platform.OS !== 'web' ? (
        <View style={StyleSheet.absoluteFill}>
          {renderMap(cameraRef, false)}
          
          {expandable && (
            <TouchableOpacity style={styles.expandHitArea} onPress={() => setIsExpanded(true)}>
              <View style={styles.expandBadge}>
                <MaterialIcons name="fullscreen" size={18} color={C.primary} />
                <Text style={styles.expandBadgeText}>Büyüt</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.webFallback}>
          <Text>Harita web'de desteklenmiyor.</Text>
        </View>
      )}

      {showControls && (
        <View style={styles.floatingControls}>
          <TouchableOpacity style={styles.floatingBtn} onPress={handleCenterOnUser}>
            <MaterialIcons name="my-location" size={20} color={hasGpsFix ? C.primary : C.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.floatingBtn} onPress={toggleMapType}>
            <MaterialIcons name="layers" size={20} color={C.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* FULLSCREEN MAP MODAL */}
      <Modal visible={isExpanded} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsExpanded(false)}>
        <View style={[styles.modalSafeArea, { paddingTop: Platform.OS === 'android' ? insets.top : 0 }]}>
          <View style={styles.modalMapWrapper}>
            {Platform.OS !== 'web' && renderMap(fullCameraRef, true)}
            
            <View style={styles.modalHeader}>
              <TouchableOpacity style={styles.modalBackBtn} onPress={() => setIsExpanded(false)}>
                <MaterialIcons name="close" size={22} color={C.text} />
              </TouchableOpacity>
              <View style={styles.modalTitleBox}>
                <Text style={styles.modalTitle}>Detaylı Rota Haritası</Text>
              </View>
            </View>

            <View style={styles.fullControls}>
              <TouchableOpacity style={styles.fullBtn} onPress={handleCenterOnUser}>
                <MaterialIcons name="my-location" size={20} color={hasGpsFix ? C.primary : C.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.fullBtn} onPress={toggleMapType}>
                <MaterialIcons name="layers" size={20} color={C.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', position: 'relative', backgroundColor: C.surfaceContainerLow, overflow: 'hidden', borderRadius: 16 },
  map: { ...StyleSheet.absoluteFillObject },
  expandHitArea: { position: 'absolute', top: Spacing.sm, right: Spacing.sm, zIndex: 15 },
  expandBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 4 },
  expandBadgeText: { ...Typography.buttonSmall, color: C.primary },
  webFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eee' },
  floatingControls: { position: 'absolute', bottom: Spacing.md, right: Spacing.sm, gap: Spacing.sm, zIndex: 10 },
  floatingBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center', ...Shadow.sm },
  modalSafeArea: { flex: 1, backgroundColor: '#FAF8FF' },
  modalMapWrapper: { flex: 1, position: 'relative' },
  modalHeader: { position: 'absolute', top: Spacing.md, left: Spacing.md, right: Spacing.md, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 24, padding: Spacing.sm, paddingRight: Spacing.md, zIndex: 20, ...Shadow.md },
  modalBackBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  modalTitleBox: { flex: 1, marginLeft: Spacing.sm },
  modalTitle: { ...Typography.bodyMedium, fontWeight: '700', color: C.onSurface },
  fullControls: { position: 'absolute', right: Spacing.md, bottom: 40, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16, padding: 4, gap: 4, zIndex: 20, ...Shadow.md },
  fullBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  customMarkerPin: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff', ...Shadow.md },
  customMarkerText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
});
