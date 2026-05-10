/**
 * Centralized logging system for the Backend Service.
 * Ensures consistent log formatting and prepares for future external monitoring (e.g. Datadog, ELK).
 */
export const logger = {
  info: (message, meta = {}) => {
    console.log(`[${new Date().toISOString()}] [INFO] ${message}`, Object.keys(meta).length ? meta : '');
  },
  warn: (message, meta = {}) => {
    console.warn(`[${new Date().toISOString()}] [WARN] ${message}`, Object.keys(meta).length ? meta : '');
  },
  error: (message, error = null) => {
    console.error(`[${new Date().toISOString()}] [ERROR] ${message}`);
    if (error) {
      console.error(error.stack || error);
    }
  }
};
