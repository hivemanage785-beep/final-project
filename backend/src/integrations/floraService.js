import axios from 'axios';
import cache from '../lib/cache.js';
import { logger } from '../utils/logger.js';

export async function fetchFlora(lat, lng) {
  const cacheKey = `flora:${lat.toFixed(2)}:${lng.toFixed(2)}`;
  
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get('https://api.gbif.org/v1/occurrence/search', {
      params: {
        decimalLatitude: `${(lat - 0.07).toFixed(4)},${(lat + 0.07).toFixed(4)}`,
        decimalLongitude: `${(lng - 0.07).toFixed(4)},${(lng + 0.07).toFixed(4)}`,
        taxonKey: 6,
        limit: 0,
        hasCoordinate: true,
        basisOfRecord: 'HUMAN_OBSERVATION'
      },
      timeout: 5000 // Timeout protection
    });

    if (!response.data || typeof response.data.count !== 'number') {
        throw new Error('Invalid GBIF response structure');
    }

    const floraCount = Math.max(0, response.data.count);
    
    if (isNaN(floraCount)) {
        throw new Error('Invalid flora count output (NaN)');
    }

    const result = { floraCount };
    cache.set(cacheKey, result, 86400); // 24 hours
    return result;
  } catch (error) {
    logger.warn(`[Flora] Fetch failed for ${lat},${lng}: ${error.message}`);
    throw new Error(`Flora fetch failed: ${error.message}`);
  }
}
