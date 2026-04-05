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
        decimalLatitude: lat,
        decimalLongitude: lng,
        radius: 8000,
        taxonKey: 6,
        limit: 0,
        hasCoordinate: true,
        basisOfRecord: 'HUMAN_OBSERVATION'
      }
    });

    const floraCount = response.data.count || 0;
    const result = { floraCount };
    cache.set(cacheKey, result);
    return result;
  } catch (error) {
    logger.error('Flora fetch error', error);
    return { floraCount: 0 };
  }
}
