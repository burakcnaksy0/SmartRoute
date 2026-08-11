import api from './client';

export interface PlaceResult {
  placeId: string;
  name: string;
  vicinity: string;
  lat: number;
  lng: number;
  rating?: number;
  userRatingsTotal?: number;
}

export interface NearbyParkingResult {
  id: string;
  placeName: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  walkTimeMinutes: number;
  capacity?: number;
  fee: boolean;
  access?: string;
}

export const placesApi = {
  search: async (query: string): Promise<PlaceResult[]> => {
    if (!query || !query.trim()) return [];
    try {
      const response = await api.get('/locations/search', {
        params: { query: query.trim() },
      });
      const data = response.data;
      if (!Array.isArray(data)) return [];

      return data.map((item: any) => ({
        placeId: `${item.latitude}_${item.longitude}`,
        name: item.name || item.formattedAddress || query,
        vicinity: item.formattedAddress || item.street || `${item.city || ''}, ${item.country || ''}`,
        lat: item.latitude,
        lng: item.longitude,
        rating: 4.5,
        userRatingsTotal: 10,
      }));
    } catch (err) {
      console.warn('placesApi.search error, falling back to empty list:', err);
      return [];
    }
  },

  reverseGeocode: async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await api.get('/locations/reverse', {
        params: { latitude: lat, longitude: lng },
      });
      if (response.data && response.data.formattedAddress) {
        return response.data.formattedAddress;
      }
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (err) {
      console.warn('placesApi.reverseGeocode error:', err);
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  },

  getNearbyParking: async (lat: number, lng: number, radius: number = 2000): Promise<NearbyParkingResult[]> => {
    try {
      const response = await api.get('/parking/nearby', {
        params: { latitude: lat, longitude: lng, radius },
      });
      const data = response.data;
      if (!Array.isArray(data)) return [];

      return data.map((p: any) => {
        const distM = p.distanceMeters ?? 0;
        const walkMin = Math.max(1, Math.round(distM / (1.4 * 60))); // 1.4 m/s walking speed
        return {
          id: p.id || `parking_${p.latitude}_${p.longitude}`,
          placeName: p.name || 'Otopark',
          lat: p.latitude,
          lng: p.longitude,
          distanceMeters: distM,
          walkTimeMinutes: walkMin,
          capacity: p.capacity,
          fee: p.fee ?? false,
          access: p.access,
        };
      });
    } catch (err) {
      console.warn('placesApi.getNearbyParking error:', err);
      return [];
    }
  },
};

export default placesApi;
