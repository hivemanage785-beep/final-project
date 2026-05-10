import axios from 'axios';
import cache from '../common/cache.js';
import { logger } from '../common/logger.js';

import { getNDVITrend, getNDVI, getMonthlyClimateFromDataset } from './ndviLookup.js';
import { computeWeatherScore, computeFloraScore, computeSeasonScore, computeFinalScore } from '../modules/score/scoring.service.js';
import { fetchHistoricalMonthlyClimate } from './weatherService.js';

export async function getMLWeights() {
  const cacheKey = 'ml:weights';
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const defaultWeights = { weather: 0.35, flora: 0.40, season: 0.25 };
  return defaultWeights;
}

export async function predictMLScore(payload) {
  try {
    if (!process.env.ML_SERVICE_URL) {
      throw new Error("ML_SERVICE_URL is not configured");
    }

    // Cache key based on lat/lng/month to avoid repeated calls
    const cacheKey = `ml:predict:hybrid:${payload.lat}:${payload.lng}:${payload.month}`;
    const cached = cache.get(cacheKey);
    if (cached !== undefined) {
      logger.info(`[ML] Cache hit for ${cacheKey}`);
      return cached;
    }

    logger.info(`[ML] POST ${process.env.ML_SERVICE_URL}/predict`, { lat: payload.lat, lng: payload.lng, month: payload.month });

    // ── Compute ndvi_trend from local dataset lookup ───────────────────────
    const resolvedLat = payload.lat !== undefined ? payload.lat : payload.latitude;
    const resolvedLng = payload.lng !== undefined ? payload.lng : payload.longitude;

    const ndvi_trend = getNDVITrend(resolvedLat, resolvedLng, payload.month);

    logger.info(`[ML] ndvi_trend=${ndvi_trend} @ ${resolvedLat},${resolvedLng}`);

    // Map payload explicitly to guarantee FastAPI schema matches exactly
    const mlPayload = {
      latitude: resolvedLat,
      longitude: resolvedLng,
      temperature: payload.temp,
      temp: payload.temp,
      humidity: payload.humidity,
      rainfall: payload.rainfall,
      month: payload.month,
      ndvi_trend
    };

    const response = await axios.post(`${process.env.ML_SERVICE_URL}/predict`, mlPayload, {
      timeout: 20000
    });
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
    if (!process.env.ML_SERVICE_URL) {
      throw new Error("ML_SERVICE_URL is not configured");
    }
    await axios.post(`${process.env.ML_SERVICE_URL}/feedback`, payload, { timeout: 5000 });
    return true;
  } catch (error) {
    logger.error('[ML] Feedback endpoint unavailable', { message: error.message });
    return false;
  }
}

// ── Time-based Optimization Helper ──────────────────────────────────────────

/**
 * Generates ML scores for `numberOfMonths` consecutive months starting at `startMonth`,
 * using REAL historical climate normals from Open-Meteo's archive API (last 3 years averaged)
 * instead of a hardcoded seasonal offset table.
 *
 * Falls back to the offset table only when the archive API is completely unreachable.
 */
export async function generateMonthlyScores(lat, lng, baseWeatherData, startMonth, numberOfMonths = 3) {
  const scores = [];

  // ── Hardcoded seasonal offsets kept ONLY as a last-resort fallback ─────────
  // Applied to baseWeatherData when the Open-Meteo archive is unreachable.
  const SEASONAL_OFFSETS = [
    { temp: -2, rain: -10, humid: -5 }, // Jan
    { temp:  0, rain:  -5, humid: -2 }, // Feb
    { temp:  2, rain:   0, humid:  0 }, // Mar
    { temp:  4, rain:  10, humid:  5 }, // Apr
    { temp:  5, rain:  20, humid: 10 }, // May
    { temp:  4, rain:  50, humid: 15 }, // Jun
    { temp:  2, rain:  80, humid: 20 }, // Jul
    { temp:  1, rain:  60, humid: 15 }, // Aug
    { temp:  0, rain:  30, humid: 10 }, // Sep
    { temp: -1, rain:  15, humid:  5 }, // Oct
    { temp: -2, rain:   0, humid:  0 }, // Nov
    { temp: -3, rain:  -5, humid: -5 }, // Dec
  ];

  for (let i = 0; i < numberOfMonths; i++) {
    const currentMonth = ((startMonth - 1 + i) % 12) + 1;

    // ── Resolve real weather for this month ────────────────────────────────
    let temp, rainfall, humidity;

    try {
      // PRIMARY: Real historical data from Open-Meteo archive (last 3 years averaged)
      const climate = await fetchHistoricalMonthlyClimate(lat, lng, currentMonth);
      temp     = climate.avgTemp;
      rainfall = climate.avgRain;
      humidity = climate.avgHumidity;
      logger.info(`[ML] Historical climate for month=${currentMonth} @ ${lat},${lng}: temp=${temp} rain=${rainfall} hum=${humidity} (${climate.yearsUsed} yrs)`);
    } catch (climateErr) {
      logger.warn(`[ML] Archive API unavailable for month=${currentMonth}: ${climateErr.message}`);

      // SECONDARY: Real TN dataset climate normals (inverse-distance-weighted, no internet)
      const datasetClimate = getMonthlyClimateFromDataset(lat, lng, currentMonth);
      if (datasetClimate) {
        temp     = datasetClimate.avgTemp;
        rainfall = datasetClimate.avgRain;
        humidity = datasetClimate.avgHumidity;
        logger.info(`[ML] Dataset climate fallback for month=${currentMonth}: temp=${temp} rain=${rainfall} hum=${humidity} (${datasetClimate.recordCount} records, source=${datasetClimate.source})`);
      } else {
        // LAST RESORT: Seasonal offset applied to current week's live weather
        logger.warn(`[ML] Dataset fallback also unavailable for month=${currentMonth} — using seasonal offset table.`);
        const offset = SEASONAL_OFFSETS[currentMonth - 1];
        temp     = (baseWeatherData.avgTemp     ?? baseWeatherData.temp     ?? 28) + offset.temp;
        rainfall = Math.max(0, (baseWeatherData.avgRain ?? baseWeatherData.rainfall ?? 0) + offset.rain);
        humidity = (baseWeatherData.avgHumidity ?? baseWeatherData.humidity ?? 60)  + offset.humid;
      }
    }

    // ── Run ML prediction with real climate values ─────────────────────────
    const result = await predictMLScore({
      lat,
      lng,
      temp,
      humidity,
      rainfall,
      month: currentMonth,
    });

    if (result && result.score != null && isFinite(result.score)) {
      scores.push(Number(result.score.toFixed(2)));
    } else {
      logger.warn(`[ML] generateMonthlyScores: ML null for month=${currentMonth} @ ${lat},${lng} — using weighted fallback`);
      const wScore = computeWeatherScore(temp, Math.max(0, rainfall), 10);
      const fScore = computeFloraScore(50);
      const sScore = computeSeasonScore(currentMonth);
      const fallback = computeFinalScore(wScore, fScore, sScore, { weather: 0.35, flora: 0.40, season: 0.25 });
      scores.push(Number(fallback.toFixed(2)));
    }
  }

  return scores;
}
