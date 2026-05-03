/**
 * CRITICAL RULE: NEVER use native fetch() directly in frontend components.
 * ALWAYS use this centralized API service (apiGet, apiPost, etc.) to ensure 
 * auth tokens, interceptors, and error handling are uniformly applied.
 */
import axios from 'axios';
import { auth } from '../firebase';

// Standard API instance with robust token injection
// Empty baseURL = use Vite proxy (dev) or same origin (prod)
const api = axios.create({ 
  baseURL: import.meta.env.VITE_BACKEND_URL || '',
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
    const originalRequest = error.config;

    // Detect 401 and avoid infinite loops
    if (error.response?.status === 401 && auth.currentUser && !originalRequest._retry) {
      console.warn('[API] Token likely expired, forcing refresh');
      originalRequest._retry = true;
      try {
        const token = await auth.currentUser.getIdToken(true);
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest); // Retry request
      } catch (err) {
        console.error('[API] Failed to auto-refresh token. Session expired.', err);
        // Force logout if refresh fails
        await auth.signOut();
        window.location.href = '/'; 
      }
    } else if (error.response?.status === 401) {
       // If retry already happened and it's still 401, sign out
       await auth.signOut();
       window.location.href = '/';
    }
    
    console.error("API ERROR:", error);
    return Promise.reject(error);
  }
);

export default api;

// Common API Helpers (Production Standardization)
export const apiGet = async (url: string, config: any = {}) => {
  const res = await api.get(url, config);
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
