/**
 * services/weatherService.js
 * Re-exports the hardened integrations/weatherService with fallback chain.
 * This file exists for import compatibility — all logic lives in integrations/.
 */
export { fetchWeather } from '../integrations/weatherService.js';

