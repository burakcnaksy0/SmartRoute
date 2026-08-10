import api from './client';

export interface UserSettings {
  mapProvider: string;
  distanceUnit: string;
  language: string;
  departureAlerts: boolean;
  serviceDisruptions: boolean;
}

export const settingsApi = {
  getSettings: async (): Promise<UserSettings> => {
    const response = await api.get<UserSettings>('/users/settings');
    return response.data;
  },

  updateSettings: async (params: Partial<UserSettings>): Promise<UserSettings> => {
    const response = await api.patch<UserSettings>('/users/settings', params);
    return response.data;
  },
};

export default settingsApi;
