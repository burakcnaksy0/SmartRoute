import { create } from 'zustand';
import settingsApi, { UserSettings } from '../api/settings';

interface SettingsState {
  mapProvider: string;
  distanceUnit: string;
  language: string;
  departureAlerts: boolean;
  serviceDisruptions: boolean;
  isLoading: boolean;
  error: string | null;

  fetchSettings: () => Promise<void>;
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
  clearError: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  mapProvider: 'OpenStreetMap',
  distanceUnit: 'Kilometre',
  language: 'Türkçe',
  departureAlerts: true,
  serviceDisruptions: false,
  isLoading: false,
  error: null,

  fetchSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await settingsApi.getSettings();
      set({
        mapProvider: data.mapProvider,
        distanceUnit: data.distanceUnit,
        language: data.language,
        departureAlerts: data.departureAlerts,
        serviceDisruptions: data.serviceDisruptions,
        isLoading: false,
      });
    } catch (e: any) {
      const msg = e?.userMessage || e?.response?.data?.error || 'Ayarlar yüklenemedi.';
      set({ error: msg, isLoading: false });
    }
  },

  updateSettings: async (settings: Partial<UserSettings>) => {
    set({ isLoading: true, error: null });
    try {
      const data = await settingsApi.updateSettings(settings);
      set({
        mapProvider: data.mapProvider,
        distanceUnit: data.distanceUnit,
        language: data.language,
        departureAlerts: data.departureAlerts,
        serviceDisruptions: data.serviceDisruptions,
        isLoading: false,
      });
    } catch (e: any) {
      const msg = e?.userMessage || e?.response?.data?.error || 'Ayarlar güncellenemedi.';
      set({ error: msg, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));

export default useSettingsStore;
