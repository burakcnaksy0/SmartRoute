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

export const placesApi = {
  search: async (query: string): Promise<PlaceResult[]> => {
    const response = await api.get<PlaceResult[]>('/places/search', {
      params: { query },
    });
    return response.data;
  },

  reverseGeocode: async (lat: number, lng: number): Promise<string> => {
    const response = await api.get<string>('/places/reverse-geocode', {
      params: { lat, lng },
    });
    return response.data;
  },
};

export default placesApi;
