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
  baseURL: import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL || '',
  headers: { 'Content-Type': 'application/json' }
});

// Middleware: Injects Firebase ID token into every request
api.interceptors.request.use(async (config) => {
  if (auth.currentUser) {
    try {
      // Force refresh only if token is close to expiry (handled by Firebase internally usually)
      const token = await auth.currentUser.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
      
      const tokenPreview = `${token.substring(0, 10)}...${token.substring(token.length - 10)}`;
      // console.log(`🚀 [API REQUEST] Token attached for ${config.url} (Token: ${tokenPreview})`);
    } catch (e) {
      console.error("❌ [API REQUEST] Failed to retrieve Firebase ID Token", e);
    }
  } else {
    // console.warn(`⚠️ [API REQUEST] No authenticated user for request to ${config.url}`);
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
      console.warn(`⏰ [API RESPONSE] 401 Unauthorized for ${originalRequest.url}. Attempting token refresh...`);
      originalRequest._retry = true;
      
      try {
        // Force refresh the token from Firebase
        console.log("🔄 [API RESPONSE] Triggering getIdToken(forceRefresh: true)...");
        const token = await auth.currentUser.getIdToken(true);
        
        if (!token) throw new Error("Firebase returned empty token after refresh");

        console.log("✅ [API RESPONSE] Token refreshed successfully. Retrying request.");
        
        // Update the failed request with new token
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest); 
      } catch (err) {
        console.error('❌ [API RESPONSE] Token auto-refresh failed. Checking session validity...', err);
        
        // Only logout if the Firebase session itself is truly invalid
        // If it's a network error or something else, we might want to stay logged in
        if (err.code === 'auth/user-token-expired' || err.code === 'auth/user-not-found') {
             console.error("🚫 [API RESPONSE] Session invalid. Logging out.");
             await auth.signOut();
             window.location.href = '/login?reason=expired'; 
        } else {
            console.warn("⚠️ [API RESPONSE] Refresh failed but session might still be valid (e.g. network error). Not logging out yet.");
        }
      }
    } 
    
    // If it's a 401 and we ALREADY retried, check the server's error message
    // before taking any destructive action.
    if (error.response?.status === 401 && originalRequest._retry) {
      const serverError = (error.response?.data?.error || '').toLowerCase();

      // Only force-logout if the server explicitly confirms the token is invalid.
      // Do NOT logout on transient 401s from cold starts, rate limits, or misrouted
      // public-endpoint requests (e.g. trace page before Firebase initializes).
      const isConfirmedTokenInvalid =
        serverError.includes('expired') ||
        serverError.includes('revoked') ||
        serverError.includes('invalid token') ||
        serverError.includes('id token');

      if (auth.currentUser && isConfirmedTokenInvalid) {
        console.error(`❌ [API RESPONSE] Confirmed token rejection ("${serverError}"). Logging out.`);
        await auth.signOut();
        window.location.href = '/login?reason=verification_failure';
      } else {
        // Transient or unrelated 401 — surface as error, do not destroy session
        console.warn(`⚠️ [API RESPONSE] Persistent 401 but not confirmed token expiry. Not logging out. Server: "${serverError || 'No message'}"`);  
      }
    }
    
    // console.error(`❌ [API ERROR] ${error.response?.status} - ${error.config?.url}:`, error.response?.data);
    return Promise.reject(error);
  }
);

export default api;

// Common API Helpers (Production Standardization)
export const apiGet = async <T = any>(url: string, config: any = {}): Promise<T> => {
  const res = await api.get<T>(url, config);
  return res.data;
};

export const apiPost = async <T = any>(url: string, data?: any): Promise<T> => {
  const res = await api.post<T>(url, data);
  return res.data;
};

export const apiPatch = async <T = any>(url: string, data?: any): Promise<T> => {
  const res = await api.patch<T>(url, data);
  return res.data;
};

export const apiDelete = async <T = any>(url: string): Promise<T> => {
  const res = await api.delete<T>(url);
  return res.data;
};
