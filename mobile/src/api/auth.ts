import api from './client';

export interface AuthResponseData {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
  fullName: string;
}

export interface RegisterParams {
  email: string;
  password: string;
  fullName: string;
  defaultVehicleType?: string;
}

export interface LoginParams {
  email: string;
  password: string;
}

export const authApi = {
  login: async (params: LoginParams): Promise<AuthResponseData> => {
    const response = await api.post<AuthResponseData>('/auth/login', params);
    return response.data;
  },

  register: async (params: RegisterParams): Promise<AuthResponseData> => {
    const response = await api.post<AuthResponseData>('/auth/register', params);
    return response.data;
  },

  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.warn('Logout call failed, clearing local session anyway', e);
    }
  },
};

export default authApi;
