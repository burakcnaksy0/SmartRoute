import api from './client';

export interface SavedLocation {
  id: string;
  label: string;
  lat: number;
  lng: number;
  address: string;
  category?: string;
  createdAt: string;
}

export interface SaveLocationRequest {
  label?: string;
  lat: number;
  lng: number;
  address: string;
  category?: string;
}

export const savedLocationsApi = {
  getLocations: async (): Promise<SavedLocation[]> => {
    const response = await api.get('/locations/saved');
    return response.data;
  },

  saveLocation: async (data: SaveLocationRequest): Promise<SavedLocation> => {
    const response = await api.post('/locations/saved', data);
    return response.data;
  },

  deleteLocation: async (id: string): Promise<void> => {
    await api.delete(`/locations/saved/${id}`);
  }
};
