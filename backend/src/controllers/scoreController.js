import { GeoTile } from '../models/GeoTile.js';
import { predictMLScore } from '../integrations/mlService.js';
import { computeWeatherScore, computeFloraScore, computeSeasonScore, computeFinalScore, deriveOutputs } from '../core/scoringEngine.js';
import { toTileKey, toTileCoords } from '../lib/tileUtils.js';
import { logger } from '../utils/logger.js';

export async function scoreController(req, res, next) {
  try {
    const { lat, lng, month } = req.body;

    const tileKey = toTileKey(lat, lng, month);
    const { lat: tileLat, lng: tileLng } = toTileCoords(lat, lng);

    // ─── READ-ONLY: fetch from precomputed GeoTile ───────────────────────────
    let tile = null;

    if (!global.IS_MOCKED_DB) {
      tile = await GeoTile.findOne({ tileKey }).lean();
    }

    // ─── TILE MISSING: return explicit error (no external calls) ─────────────
    if (!tile || tile.ttlExpires < new Date()) {
      logger.warn(`[Score] Tile not ready for ${tileKey} — returning DATA_NOT_READY`);

      // In mock/dev mode, fall back through to live calls for local DX
      if (!global.IS_MOCKED_DB) {
        return res.status(503).json({
          success: false,
          error: 'DATA_NOT_READY',
          message: 'Tile data is being precomputed. Try again shortly.',
          tileKey
        });
      }

      // Dev/mock mode: still run live (so local dev works without scheduler)
      return await liveScoreFallback(req, res, next, lat, lng, month);
    }

    // ─── TILE FRESH: compose response from precomputed data ──────────────────
    const weatherScore = computeWeatherScore(tile.avgTemp ?? 28, tile.avgRain ?? 0, tile.avgWind ?? 5);
    const floraScore   = computeFloraScore(tile.floraCount ?? 0);
    const seasonScore  = computeSeasonScore(month);
    const mlWeights    = { weather: 0.35, flora: 0.40, season: 0.25 };

    const weatherData  = { avgTemp: tile.avgTemp, avgRain: tile.avgRain, avgWind: tile.avgWind };

    let payload;

    if (tile.mlScore !== null) {
      payload = deriveOutputs(tile.mlScore, weatherScore, floraScore, seasonScore, month, weatherData, tile.floraCount, mlWeights);
      payload.riskLevel    = tile.mlRisk;
      payload.mlConfidence = tile.mlConfidence;
      payload.mlWarning    = tile.mlWarning;
      payload.mlModel      = tile.mlModel;
    } else {
      // ML was not run during precompute (missing env data) — use heuristic
      const finalScore = computeFinalScore(weatherScore, floraScore, seasonScore, mlWeights);
      payload = deriveOutputs(finalScore, weatherScore, floraScore, seasonScore, month, weatherData, tile.floraCount ?? 0, mlWeights);
      payload.riskLevel    = finalScore > 45 ? 2 : (finalScore > 30 ? 1 : 0);
      payload.mlConfidence = 0.3;
      payload.mlWarning    = 'LOW_CONFIDENCE_PREDICTION';
      payload.mlModel      = 'heuristic_fallback';
    }

    payload.tileKey     = tileKey;
    payload.dataSource  = 'precomputed';
    payload.computedAt  = tile.computedAt;
    payload.ndvi        = tile.ndvi;

    return res.status(200).json({ success: true, data: payload });

  } catch (error) {
    next(error);
  }
}

// ─── DEV-ONLY LIVE FALLBACK (not used in production) ─────────────────────────
async function liveScoreFallback(req, res, next, lat, lng, month) {
  const { fetchWeather } = await import('../integrations/weatherService.js');
  const { fetchFlora }   = await import('../integrations/floraService.js');
  const { fetchNDVI }    = await import('../integrations/ndviService.js');
  const { computeWeatherScore, computeFloraScore, computeSeasonScore, computeFinalScore, deriveOutputs } = await import('../core/scoringEngine.js');

  try {
    let weatherData = { avgTemp: 28.0, avgHumidity: 65.0, avgRain: 0, avgWind: 5.0 };
    let floraData   = { floraCount: 5 };
    let ndviVal     = null;

    const [_w, _f, _n] = await Promise.allSettled([
      fetchWeather(lat, lng),
      fetchFlora(lat, lng),
      fetchNDVI(lat, lng, new Date().toISOString())
    ]);
    if (_w.status === 'fulfilled') weatherData = _w.value;
    if (_f.status === 'fulfilled') floraData   = _f.value;
    if (_n.status === 'fulfilled') ndviVal     = _n.value.ndvi;

    const mlPayload = { lat, lng, month, temp: weatherData.avgTemp, humidity: weatherData.avgHumidity, rainfall: weatherData.avgRain, ndvi: ndviVal, flora: floraData.floraCount };

    const mlResult = await import('../integrations/mlService.js').then(m => m.predictMLScore(mlPayload));

    const weatherScore = computeWeatherScore(weatherData.avgTemp, weatherData.avgRain, weatherData.avgWind);
    const floraScore   = computeFloraScore(floraData.floraCount);
    const seasonScore  = computeSeasonScore(month);
    const mlWeights    = { weather: 0.35, flora: 0.40, season: 0.25 };

    let payload;
    if (mlResult) {
      payload = deriveOutputs(mlResult.score, weatherScore, floraScore, seasonScore, month, weatherData, floraData.floraCount, mlWeights);
      payload.riskLevel    = mlResult.risk;
      payload.mlConfidence = mlResult.confidence;
      payload.mlWarning    = mlResult.warning || null;
      payload.mlModel      = mlResult.model || 'hybrid_rf';
    } else {
      const finalScore = computeFinalScore(weatherScore, floraScore, seasonScore, mlWeights);
      payload = deriveOutputs(finalScore, weatherScore, floraScore, seasonScore, month, weatherData, floraData.floraCount, mlWeights);
      payload.riskLevel    = finalScore > 45 ? 2 : (finalScore > 30 ? 1 : 0);
      payload.mlConfidence = 0.3;
      payload.mlWarning    = 'LOW_CONFIDENCE_PREDICTION';
      payload.mlModel      = 'heuristic_fallback';
    }

    payload.dataSource = 'live_dev_fallback';
    return res.status(200).json({ success: true, data: payload });
  } catch (error) {
    next(error);
  }
}
