import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import {
  resolveApiBaseUrl,
  shouldFallbackToSameOrigin,
  formatNetworkErrorMessage
} from '../utils/apiUrl';

const API_BASE = resolveApiBaseUrl(
  import.meta.env.VITE_API_BASE_URL,
  typeof window !== 'undefined' ? window.location : undefined
);
export const TOKEN_KEY = 'kisan_auth_token';

export class ApiError extends Error {
  status: number;
  code?: string;
  data?: Record<string, unknown>;

  constructor(status: number, message: string, data?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = typeof data?.code === 'string' ? data.code : undefined;
    this.data = data;
  }
}

type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

export function onUnauthorizedSession(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

apiClient.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<Record<string, unknown>>) => {
    const status = error.response?.status ?? 0;
    const originalConfig = error.config as (AxiosRequestConfig & { _retriedSameOrigin?: boolean }) | undefined;
    const effectiveBase = originalConfig?.baseURL || apiClient.defaults.baseURL;

    if (
      originalConfig &&
      typeof window !== 'undefined' &&
      shouldFallbackToSameOrigin(effectiveBase, status, originalConfig._retriedSameOrigin)
    ) {
      apiClient.defaults.baseURL = '/api';
      originalConfig.baseURL = '/api';
      originalConfig._retriedSameOrigin = true;
      return apiClient.request(originalConfig);
    }

    const data = error.response?.data;
    const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine !== false;
    const message = formatNetworkErrorMessage({
      status,
      isOnline,
      errorCode: error.code,
      dataError: typeof data?.error === 'string' ? data.error : undefined,
      dataMessage: typeof data?.message === 'string' ? data.message : undefined
    });

    if (status === 401 && typeof window !== 'undefined') {
      const url = error.config?.url || '';
      const isAuthAttempt = url.includes('/auth/login') || url.includes('/auth/verify-otp');
      if (!isAuthAttempt && localStorage.getItem(TOKEN_KEY)) {
        localStorage.removeItem(TOKEN_KEY);
        unauthorizedListeners.forEach((fn) => fn());
      }
    }

    return Promise.reject(new ApiError(status, message, data));
  }
);

export async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const method = (options.method || 'GET').toUpperCase();
  const axiosConfig: AxiosRequestConfig = {
    url,
    method,
    headers: options.headers as Record<string, string> | undefined,
    data: typeof options.body === 'string' ? JSON.parse(options.body) : options.body
  };
  const res = await apiClient.request<T>(axiosConfig);
  return res.data;
}
