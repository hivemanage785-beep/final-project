import axios from 'axios';
import cache from '../lib/cache.js';
import { logger } from '../utils/logger.js';

export async function getMLWeights() {
  const cacheKey = 'ml:weights';
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const defaultWeights = { weather: 0.35, flora: 0.40, season: 0.25 };
  try {
    const mlUrl = process.env.ML_SERVICE_URL;
    if (!mlUrl) return defaultWeights;
    
    const response = await axios.get(`${mlUrl}/predict-weights`, { timeout: 3000 });
    const { weather, flora, season } = response.data;
    if (weather && flora && season) {
      const weights = { weather, flora, season };
      cache.set(cacheKey, weights, 1800); // 30 min cache TTL manually set if we want or just use default 15
      return weights;
    }
    return defaultWeights;
  } catch (error) {
    logger.warn('ML service unavailable, using default weights', { message: error.message });
    return defaultWeights;
  }
}
