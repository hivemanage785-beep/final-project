import axios from 'axios';
import { auth } from '../firebase';

// Standard API instance with robust token injection
const api = axios.create({ 
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
  headers: { 'Content-Type': 'application/json' }
});

// Middleware: Injects Firebase ID token into every request
api.interceptors.request.use(async (config) => {
  if (auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    } catch (e) {
      console.warn("[API] Failed to retrieve Firebase ID Token", e);
    }
  }
  return config;
}, (error) => Promise.reject(error));

// Middleware: Handles 401 unauthorized errors (token refresh)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && auth.currentUser) {
      console.warn('[API] Token likely expired, forcing refresh');
      try {
        const token = await auth.currentUser.getIdToken(true);
        if (error.config) {
            error.config.headers.Authorization = `Bearer ${token}`;
            return axios.request(error.config);
        }
      } catch (err) {
        console.error('[API] Failed to auto-refresh token', err);
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Common API Helpers (Production Standardization)
export const apiGet = async (url: string, params = {}) => {
  const res = await api.get(url, { params });
  return res.data;
};

export const apiPost = async (url: string, data: any) => {
  const res = await api.post(url, data);
  return res.data;
};

export const apiPatch = async (url: string, data: any) => {
  const res = await api.patch(url, data);
  return res.data;
};

export const apiDelete = async (url: string) => {
  const res = await api.delete(url);
  return res.data;
};
