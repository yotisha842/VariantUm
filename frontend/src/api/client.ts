import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';
import type { User } from '../types/api';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api';
export const apiClient = axios.create({ baseURL, withCredentials: true });
const refreshClient = axios.create({ baseURL, withCredentials: true });
let refreshing: Promise<void> | null = null;
type RetryConfig = InternalAxiosRequestConfig & { retried?: boolean };

apiClient.interceptors.response.use(response => response, async (error: AxiosError) => {
  const config = error.config as RetryConfig | undefined;
  if (error.response?.status !== 401 || !config || config.retried || /^\/auth\/(login|register|refresh|logout)(?:$|\?)/.test(config.url ?? '')) {
    return Promise.reject(error);
  }
  config.retried = true;
  try {
    refreshing ??= refreshClient.post<User>('/auth/refresh')
      .then(response => { useAuthStore.getState().setUser(response.data); })
      .finally(() => { refreshing = null; });
    await refreshing;
    return apiClient.request(config);
  } catch (refreshError) {
    useAuthStore.getState().clear();
    if (window.location.pathname !== '/login') window.location.assign('/login');
    return Promise.reject(refreshError);
  }
});

export type ApiError = {
  error: string;
  message?: string;
  fields?: Array<{ field: string; message: string }>;
  retryAfter?: number;
};
