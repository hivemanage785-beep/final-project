/**
 * Hardened API client
 * Fixes:
 * - CRITICAL: No timeout → hangs forever on 2G/backend down
 * - HIGH: console.log leaks in production
 * - HIGH: apiFetch returns `data` but callers expect `data.data` — normalized here
 * - MEDIUM: No offline detection before fetch attempt
 * - MEDIUM: No retry logic for transient failures
 */

interface ApiOptions extends RequestInit {
  body?: any;
  timeoutMs?: number;
  retries?: number;
}

const IS_DEV = import.meta.env.DEV;

function apiLog(...args: any[]) {
  if (IS_DEV) console.log(...args);
}

export async function apiFetch(endpoint: string, options: ApiOptions = {}): Promise<any> {
  const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  const timeoutMs = options.timeoutMs ?? 10000;
  const maxRetries = options.retries ?? 1;

  // ── Offline guard ────────────────────────────────────────────────────────
  if (!navigator.onLine) {
    const offlineError = new Error('OFFLINE');
    (offlineError as any).isOffline = true;
    throw offlineError;
  }

  const token = localStorage.getItem('auth_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const method = options.method || 'GET';
  apiLog(`>>> [API] ${method} ${endpoint}`);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timer);
      let data: any;

      // ── Safe JSON parse — guard against non-JSON from CDN/proxy errors ──
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Non-JSON response (${response.status}): ${text.slice(0, 200)}`);
      }

      apiLog(`<<< [API] ${response.status} ${endpoint}`, data);

      if (!response.ok) {
        const err = new Error(data?.error || `HTTP ${response.status}`);
        (err as any).status = response.status;
        (err as any).code = data?.error;
        throw err;
      }

      // Normalize: return data.data if present, else entire data object
      return data?.data !== undefined ? data.data : data;

    } catch (err: any) {
      clearTimeout(timer);

      if (err.name === 'AbortError') {
        lastError = new Error(`Request timeout after ${timeoutMs}ms: ${endpoint}`);
        (lastError as any).isTimeout = true;
      } else {
        lastError = err;
      }

      const isRetryable = (lastError as any).isTimeout || (lastError as any).status >= 500;
      if (!isRetryable || attempt >= maxRetries) break;

      // Exponential backoff: 500ms, 1000ms
      await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
    }
  }

  console.error(`!!! [API ERROR] ${method} ${endpoint}:`, lastError?.message);
  throw lastError!;
}
