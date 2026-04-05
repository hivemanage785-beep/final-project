import axios from 'axios';
import cache from '../lib/cache.js';
import { logger } from '../utils/logger.js';

export async function getMLWeights() {
  const cacheKey = 'ml:weights';
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const defaultWeights = { weather: 0.35, flora: 0.40, season: 0.25 };
  return defaultWeights;
}

export async function predictMLScore(payload) {
  try {
    const mlUrl = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';

    // Cache key based on lat/lng/month to avoid repeated calls
    const cacheKey = `ml:predict:hybrid:${payload.lat}:${payload.lng}:${payload.month}`;
    const cached = cache.get(cacheKey);
    if (cached !== undefined) {
      logger.info(`[ML] Cache hit for ${cacheKey}`);
      return cached;
    }

    logger.info(`[ML] POST ${mlUrl}/predict`, { lat: payload.lat, lng: payload.lng, month: payload.month });
    const response = await axios.post(`${mlUrl}/predict`, payload, { timeout: 5000 });
    
    // Model now returns { score, risk, confidence }
    const result = response.data;
    
    if (result && result.score !== null && result.score !== undefined) {
      cache.set(cacheKey, result, 600); // Cache for 10 minutes
    }
    
    return result;
  } catch (error) {
    logger.error('[ML] Predict endpoint unavailable', { message: error.message });
    return null; // Fallback — scoreController handles null gracefully
  }
}

export async function sendMLFeedback(payload) {
  try {
    const mlUrl = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';
    logger.info(`[ML] POST ${mlUrl}/feedback`);
    await axios.post(`${mlUrl}/feedback`, payload, { timeout: 5000 });
    return true;
  } catch (error) {
    logger.error('[ML] Feedback endpoint unavailable', { message: error.message });
    return false;
  }
}
