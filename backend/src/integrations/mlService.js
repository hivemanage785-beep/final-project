import axios from 'axios';
import cache from '../lib/cache.js';
import { logger } from '../utils/logger.js';

import { getNDVITrend, getNDVI } from './ndviLookup.js';
import { computeWeatherScore, computeFloraScore, computeSeasonScore, computeFinalScore } from '../core/scoringEngine.js';

export async function getMLWeights() {
  const cacheKey = 'ml:weights';
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const defaultWeights = { weather: 0.35, flora: 0.40, season: 0.25 };
  return defaultWeights;
}

export async function predictMLScore(payload) {
  try {
    let mlUrl = process.env.ML_SERVICE_URL;
    if (!mlUrl) throw new Error("ML_SERVICE_URL is not configured");
    mlUrl = mlUrl.replace(/\/$/, "");

    // Cache key based on lat/lng/month to avoid repeated calls
    const cacheKey = `ml:predict:hybrid:${payload.lat}:${payload.lng}:${payload.month}`;
    const cached = cache.get(cacheKey);
    if (cached !== undefined) {
      logger.info(`[ML] Cache hit for ${cacheKey}`);
      return cached;
    }

    logger.info(`[ML] POST ${mlUrl}/predict`, { lat: payload.lat, lng: payload.lng, month: payload.month });

    // ── Compute ndvi_trend from local dataset lookup ───────────────────────
    const resolvedLat = payload.lat !== undefined ? payload.lat : payload.latitude;
    const resolvedLng = payload.lng !== undefined ? payload.lng : payload.longitude;

    const ndvi_trend = getNDVITrend(resolvedLat, resolvedLng, payload.month);

    logger.info(`[ML] ndvi_trend=${ndvi_trend} @ ${resolvedLat},${resolvedLng}`);

    // Map payload explicitly to guarantee FastAPI schema matches exactly
    const mlPayload = {
      latitude: resolvedLat,
      longitude: resolvedLng,
      temp: payload.temp,
      humidity: payload.humidity,
      rainfall: payload.rainfall,
      month: payload.month,
      ndvi_trend
    };

    console.log("[ML PAYLOAD]", mlPayload);

    // Offline architecture: ML is only used during tile generation
    const result = null;
    
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
    let mlUrl = process.env.ML_SERVICE_URL;
    if (!mlUrl) throw new Error("ML_SERVICE_URL is not configured");
    mlUrl = mlUrl.replace(/\/$/, "");
    // Offline architecture
    // await axios.post(`${mlUrl}/feedback`, payload, { timeout: 5000 });
    return true;
  } catch (error) {
    logger.error('[ML] Feedback endpoint unavailable', { message: error.message });
    return false;
  }
}

// ── Time-based Optimization Helper ──────────────────────────────────────────
export async function generateMonthlyScores(lat, lng, baseWeatherData, startMonth, numberOfMonths = 3) {
  const scores = [];
  
  function getSeasonalOffset(m) {
    const offsets = [
        { temp: -2, rain: -10, humid: -5 }, // Jan
        { temp: 0, rain: -5, humid: -2 },   // Feb
        { temp: 2, rain: 0, humid: 0 },     // Mar
        { temp: 4, rain: 10, humid: 5 },    // Apr
        { temp: 5, rain: 20, humid: 10 },   // May
        { temp: 4, rain: 50, humid: 15 },   // Jun
        { temp: 2, rain: 80, humid: 20 },   // Jul
        { temp: 1, rain: 60, humid: 15 },   // Aug
        { temp: 0, rain: 30, humid: 10 },   // Sep
        { temp: -1, rain: 15, humid: 5 },   // Oct
        { temp: -2, rain: 0, humid: 0 },    // Nov
        { temp: -3, rain: -5, humid: -5 }   // Dec
    ];
    return offsets[m - 1] || offsets[0];
  }

  for (let i = 0; i < numberOfMonths; i++) {
    const currentMonth = ((startMonth - 1 + i) % 12) + 1;
    const offset = getSeasonalOffset(currentMonth);

    const temp = (baseWeatherData.avgTemp ?? baseWeatherData.temp ?? 28) + offset.temp; 
    const rainfall = Math.max(0, (baseWeatherData.avgRain ?? baseWeatherData.rainfall ?? 0) + offset.rain);
    const humidity = (baseWeatherData.avgHumidity ?? baseWeatherData.humidity ?? 60) + offset.humid;

    // predictMLScore will handle getNDVI & getNDVITrend automatically based on month inside its scope
    const result = await predictMLScore({
      lat,
      lng,
      temp,
      humidity,
      rainfall,
      month: currentMonth
    });

    if (result && result.score != null && isFinite(result.score)) {
      scores.push(Number(result.score.toFixed(2)));
    } else {
      // ML unavailable for this month — degrade deterministically via weighted scoring
      logger.warn(`[ML] generateMonthlyScores: ML null for month=${currentMonth} @ ${lat},${lng} — using weighted fallback`);
      const wScore = computeWeatherScore(temp, Math.max(0, rainfall), 10);
      const fScore = computeFloraScore(50); // dataset average placeholder
      const sScore = computeSeasonScore(currentMonth);
      const fallback = computeFinalScore(wScore, fScore, sScore, { weather: 0.35, flora: 0.40, season: 0.25 });
      scores.push(Number(fallback.toFixed(2)));
    }
  }

  return scores;
}
