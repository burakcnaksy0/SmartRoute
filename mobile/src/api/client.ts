import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import Constants from 'expo-constants';

import { Platform } from 'react-native';

const getBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // If running in Expo development, dynamically use Metro host IP
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest?.debuggerHost || (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
  if (__DEV__ && hostUri) {
    const host = hostUri.split(':').shift();
    if (host) {
      return `http://${host}:8082/api/v1`;
    }
  }

  // Android emulator fallback
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8082/api/v1';
  }

  // iOS Simulator / Web fallback
  return 'http://localhost:8082/api/v1';
};

const baseUrl = getBaseUrl();
console.log('🚀 SMART ROUTE API BASE URL HEDEFİ:', baseUrl);

export const api = axios.create({
  baseURL: baseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor to attach JWT
api.interceptors.request.use(
  async (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 and refresh token
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if it is a 401 error and the request hasn't been retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      // If the request was to the auth/refresh or auth/login or auth/register endpoint, do not attempt refresh
      if (
        originalRequest.url?.includes('/auth/refresh') ||
        originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/register')
      ) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = useAuthStore.getState().refreshToken;

      if (!refreshToken) {
        isRefreshing = false;
        await useAuthStore.getState().logout();
        return Promise.reject(error);
      }

      try {
        const refreshResponse = await axios.post(`${baseUrl}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = refreshResponse.data;

        await useAuthStore.getState().updateTokens(newAccessToken, newRefreshToken);

        processQueue(null, newAccessToken);
        isRefreshing = false;

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        await useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      }
    }

    // ─── STOP-004 / SYS-002: Centralized Turkish error normalization ───────
    // Normalize raw technical errors into user-friendly Turkish messages
    // before rejecting, so no raw axios/JS error messages leak to the UI.
    normalizeErrorMessage(error);

    return Promise.reject(error);
  }
);

/**
 * Normalizes error objects with a user-friendly Turkish message.
 * UI code should use `error.userMessage` instead of `error.message`.
 */
function normalizeErrorMessage(error: any): void {
  // Already has a server-provided Turkish message
  if (error.response?.data?.error && typeof error.response.data.error === 'string') {
    error.userMessage = error.response.data.error;
    return;
  }

  // Timeout
  if (error.code === 'ECONNABORTED') {
    error.userMessage = 'Bağlantı zaman aşımına uğradı. Lütfen tekrar deneyin.';
    return;
  }

  // Network error (no response at all)
  if (!error.response) {
    error.userMessage = 'Sunucuya ulaşılamıyor. İnternet bağlantınızı kontrol edin.';
    return;
  }

  // HTTP status-based messages
  const status = error.response?.status;
  if (status === 400) {
    error.userMessage = error.response?.data?.message || 'Geçersiz istek. Lütfen bilgilerinizi kontrol edin.';
  } else if (status === 403) {
    error.userMessage = 'Bu işlem için yetkiniz bulunmuyor.';
  } else if (status === 404) {
    error.userMessage = 'İstenen kaynak bulunamadı.';
  } else if (status === 409) {
    error.userMessage = 'Bu işlem bir çakışmaya neden oldu. Lütfen sayfayı yenileyip tekrar deneyin.';
  } else if (status === 422) {
    error.userMessage = 'Gönderilen veriler işlenemiyor. Lütfen alanları kontrol edin.';
  } else if (status === 429) {
    error.userMessage = 'Çok fazla istek gönderildi. Lütfen bir süre bekleyip tekrar deneyin.';
  } else if (status >= 500) {
    error.userMessage = 'Sunucuda geçici bir sorun oluştu. Lütfen birkaç dakika sonra tekrar deneyin.';
  } else {
    error.userMessage = 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.';
  }
}

export default api;
