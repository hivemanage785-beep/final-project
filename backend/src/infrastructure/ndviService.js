import cache from '../common/cache.js';
import { logger } from '../common/logger.js';
import { getNDVI } from './ndviLookup.js';

/**
 * Fetches NDVI from local dataset lookups.
 * Eliminates dependency on AgroMonitoring external APIs.
 */
export async function fetchNDVI(lat, lng, date) {
  const quantizedLat = lat.toFixed(2);
  const quantizedLng = lng.toFixed(2);
  const cacheKey = `ndvi:${quantizedLat}:${quantizedLng}:${date.split('T')[0]}`;
  
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const month = new Date(date).getMonth() + 1;
    const ndviVal = getNDVI(lat, lng, month);

    const result = {
      ndvi: ndviVal,
      source: "local-dataset",
      timestamp: new Date().toISOString(),
      resolution_m: 10
    };

    cache.set(cacheKey, result, 86400); 
    return result;

  } catch (error) {
    logger.error(`NDVI dataset lookup error: ${error.message}`);
    return { ndvi: null, error: 'NDVI_UNAVAILABLE' };
  }
}
