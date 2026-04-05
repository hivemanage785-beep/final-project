/**
 * tileScheduler.js
 * Background precomputation engine for GeoTile data.
 * Schedule: every 6 hours.
 * Covers Tamil Nadu region (8.0–13.5°N, 76.5–80.5°E) at 0.02° grid resolution.
 */

import { fetchWeather } from '../integrations/weatherService.js';
import { fetchFlora } from '../integrations/floraService.js';
import { fetchNDVI } from '../integrations/ndviService.js';
import { predictMLScore } from '../integrations/mlService.js';
import { GeoTile } from '../models/GeoTile.js';
import { toTileKey } from '../lib/tileUtils.js';
import { logger } from '../utils/logger.js';

// Region bounds (Tamil Nadu) — expand as needed
const LAT_MIN  = 8.0;
const LAT_MAX  = 13.5;
const LNG_MIN  = 76.5;
const LNG_MAX  = 80.5;
const STEP     = 0.02; // ~2.2km tiles
const CONCURRENCY = 10; // Max parallel external API calls

async function computeTile(lat, lng, month) {
  const tileKey = toTileKey(lat, lng, month);

  // Skip if fresh tile exists (< 6h old)
  const existing = await GeoTile.findOne({ tileKey });
  if (existing && existing.ttlExpires > new Date()) {
    return; // Still fresh — skip
  }

  let weatherData = null;
  let floraData   = null;
  let ndviData    = null;

  try { weatherData = await fetchWeather(lat, lng); } catch (_) {}
  try { floraData   = await fetchFlora(lat, lng); }   catch (_) {}
  try { ndviData    = await fetchNDVI(lat, lng, new Date().toISOString()); } catch (_) {}

  const envData = {
    avgTemp:     weatherData?.avgTemp     ?? null,
    avgRain:     weatherData?.avgRain     ?? null,
    avgWind:     weatherData?.avgWind     ?? null,
    avgHumidity: weatherData?.avgHumidity ?? null,
    floraCount:  floraData?.floraCount    ?? null,
    ndvi:        ndviData?.ndvi           ?? null,  // stays null if unavailable — never mocked
  };

  // Only run ML if we have minimum viable data
  let mlResult = null;
  if (envData.avgTemp !== null && envData.floraCount !== null) {
    mlResult = await predictMLScore({
      lat, lng, month,
      temp:     envData.avgTemp,
      humidity: envData.avgHumidity ?? 65.0,
      rainfall: envData.avgRain ?? 0,
      ndvi:     envData.ndvi,       // null-safe — ML handles it
      flora:    envData.floraCount
    });
  }

  const doc = {
    tileKey,
    lat, lng, month,
    ...envData,
    mlScore:      mlResult?.score      ?? null,
    mlRisk:       mlResult?.risk       ?? null,
    mlConfidence: mlResult?.confidence ?? null,
    mlWarning:    mlResult?.warning    ?? null,
    mlModel:      mlResult?.model      ?? null,
    computedAt:   new Date(),
    ttlExpires:   new Date(Date.now() + 6 * 60 * 60 * 1000)
  };

  await GeoTile.findOneAndUpdate({ tileKey }, doc, { upsert: true, new: true });
}

async function runSchedulerCycle(month) {
  const startTime = Date.now();
  logger.info(`[TileScheduler] Starting precompute cycle for month=${month}`);

  const tasks = [];
  for (let lat = LAT_MIN; lat <= LAT_MAX; lat = parseFloat((lat + STEP).toFixed(2))) {
    for (let lng = LNG_MIN; lng <= LNG_MAX; lng = parseFloat((lng + STEP).toFixed(2))) {
      tasks.push({ lat, lng, month });
    }
  }

  let done = 0;
  // Execute in batches of CONCURRENCY to avoid hammering external APIs
  for (let i = 0; i < tasks.length; i += CONCURRENCY) {
    const batch = tasks.slice(i, i + CONCURRENCY);
    await Promise.allSettled(batch.map(t => computeTile(t.lat, t.lng, t.month)));
    done += batch.length;
    if (done % 100 === 0) {
      logger.info(`[TileScheduler] Progress: ${done}/${tasks.length} tiles`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  logger.info(`[TileScheduler] Cycle complete: ${tasks.length} tiles in ${elapsed}s`);
}

let schedulerInterval = null;

export function startTileScheduler() {
  const currentMonth = new Date().getMonth() + 1;

  // Run immediately on startup (async, non-blocking)
  setImmediate(() => runSchedulerCycle(currentMonth).catch(e => logger.error('[TileScheduler] Cycle error:', e.message)));

  // Then repeat every 6 hours
  schedulerInterval = setInterval(() => {
    const month = new Date().getMonth() + 1;
    runSchedulerCycle(month).catch(e => logger.error('[TileScheduler] Cycle error:', e.message));
  }, 6 * 60 * 60 * 1000);

  logger.info('[TileScheduler] Started — 6h precompute cycle active');
}

export function stopTileScheduler() {
  if (schedulerInterval) clearInterval(schedulerInterval);
}
