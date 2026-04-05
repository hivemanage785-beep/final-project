import api from '../api/axiosInstance';

interface ApiOptions extends RequestInit {
  body?: any;
  timeoutMs?: number;
  retries?: number;
}

export async function apiFetch(endpoint: string, options: ApiOptions = {}): Promise<any> {
  const method = options.method || 'GET';

  // Offline guard
  if (!navigator.onLine) {
    const offlineError = new Error('OFFLINE');
    (offlineError as any).isOffline = true;
    throw offlineError;
  }

  try {
    const response = await api.request({
      url: endpoint,
      method,
      data: options.body,
      timeout: options.timeoutMs ?? 10000 
    });
    
    // Normalize: return data.data if present, else entire object
    return response.data?.data !== undefined ? response.data.data : response.data;
  } catch (error: any) {
    if (error.response) {
      const err = new Error(error.response.data?.error || `HTTP ${error.response.status}`);
      (err as any).status = error.response.status;
      (err as any).code = error.response.data?.error;
      throw err;
    }
    throw error;
  }
}
