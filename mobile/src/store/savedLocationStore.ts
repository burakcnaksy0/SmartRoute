import { create } from 'zustand';
import { SavedLocation, savedLocationsApi } from '../api/savedLocations';

interface SavedLocationState {
  locations: SavedLocation[];
  isLoading: boolean;
  error: string | null;
  fetchLocations: () => Promise<void>;
  saveLocation: (label: string | undefined, lat: number, lng: number, address: string, category?: string) => Promise<boolean>;
  deleteLocation: (id: string) => Promise<boolean>;
}

export const useSavedLocationStore = create<SavedLocationState>((set, get) => ({
  locations: [],
  isLoading: false,
  error: null,

  fetchLocations: async () => {
    set({ isLoading: true, error: null });
    try {
      const locations = await savedLocationsApi.getLocations();
      set({ locations, isLoading: false });
    } catch (e: any) {
      set({ error: e?.userMessage || 'Kaydedilen konumlar yüklenemedi.', isLoading: false });
    }
  },

  saveLocation: async (label, lat, lng, address, category) => {
    set({ isLoading: true, error: null });
    try {
      const newLoc = await savedLocationsApi.saveLocation({ label, lat, lng, address, category });
      set((state) => ({ 
        locations: [newLoc, ...state.locations],
        isLoading: false 
      }));
      return true;
    } catch (e: any) {
      set({ error: e?.userMessage || 'Konum kaydedilemedi.', isLoading: false });
      return false;
    }
  },

  deleteLocation: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await savedLocationsApi.deleteLocation(id);
      set((state) => ({
        locations: state.locations.filter(loc => loc.id !== id),
        isLoading: false
      }));
      return true;
    } catch (e: any) {
      set({ error: e?.userMessage || 'Konum silinemedi.', isLoading: false });
      return false;
    }
  }
}));
