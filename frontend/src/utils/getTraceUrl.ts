export function getTraceUrl(publicId: string): string {
  // 1. Use Production URL if explicitly defined
  if (import.meta.env.VITE_PUBLIC_APP_URL) {
    return `${import.meta.env.VITE_PUBLIC_APP_URL}/trace/${publicId}`;
  }
  
  if (import.meta.env.VITE_FRONTEND_URL) {
    return `${import.meta.env.VITE_FRONTEND_URL}/trace/${publicId}`;
  }

  // 2. Fallback to window.location.origin
  let baseUrl = window.location.origin;

  // Fix for local mobile testing: 
  // If we are on localhost but want someone else on the network to scan,
  // this won't help unless VITE_PUBLIC_APP_URL is set to the local IP (e.g. 192.168.x.x).
  // However, window.location.origin will inherently capture the local IP if accessed via the IP.

  // 3. Validation: warn if using localhost in production build
  if (import.meta.env.PROD && (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1'))) {
    console.warn('[QR Warning] Generating localhost QR trace URL in production mode. Set VITE_PUBLIC_APP_URL to prevent this.');
  }

  return `${baseUrl}/trace/${publicId}`;
}
