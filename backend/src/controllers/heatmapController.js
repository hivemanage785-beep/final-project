import cache from '../lib/cache.js';
import axios from 'axios';
import { logger } from '../utils/logger.js';
import { fetchNDVI } from '../integrations/ndviService.js';
import { computeWeatherScore, computeFloraScore, computeSeasonScore, computeFinalScore } from '../core/scoringEngine.js';

export async function heatmapController(req, res, next) {
  try {
    const month = parseInt(req.query.month) || (new Date().getMonth() + 1);
    const neLat = parseFloat(req.query.neLat) || 13.5;
    const neLng = parseFloat(req.query.neLng) || 80.5;
    const swLat = parseFloat(req.query.swLat) || 8.0;
    const swLng = parseFloat(req.query.swLng) || 76.5;

    const cacheKey = `heatmap:${month}:${neLat.toFixed(1)}:${swLat.toFixed(1)}:${neLng.toFixed(1)}:${swLng.toFixed(1)}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.status(200).json({ success: true, data: cached });

    const points = [];
    const resolution = 20; // 20x20 grid = 400 points
    const latStep = (neLat - swLat) / (resolution - 1);
    const lngStep = (neLng - swLng) / (resolution - 1);

    const mlPayloads = [];

    const centerLat = swLat + ((neLat - swLat) / 2);
    const centerLng = swLng + ((neLng - swLng) / 2);
    
    let ndviVal = null;
    try {
      const n = await fetchNDVI(centerLat, centerLng, new Date().toISOString());
      ndviVal = n.ndvi;
    } catch(e) {}

    // Data Densification Phase
    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        const lat = swLat + (i * latStep);
        const lng = swLng + (j * lngStep);

        // Simulated environmental context 
        const avgTemp    = 28 + 4 * Math.sin((lat - 8) * 0.5) + 2 * Math.cos(lng * 0.3);
        const avgRain    = 3 + 2 * Math.sin(month * 0.5);
        const floraCount = Math.max(0, Math.min(2000, 800 + 600 * Math.sin(lat * 3.7) * Math.cos(lng * 2.1)));
        
        mlPayloads.push({
          lat, lng, month, temp: avgTemp, humidity: 65.0, rainfall: avgRain, ndvi: ndviVal, flora: floraCount
        });
      }
    }

    try {
      // Fast Bulk evaluation directly pulling real weights from Scikit Models
      const mlUrl = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';
      const mlRes = await axios.post(`${mlUrl}/predict-bulk`, { points: mlPayloads }, { timeout: 15000 });
      const mlResults = mlRes.data.results;

      for (let k = 0; k < mlPayloads.length; k++) {
        const p = mlPayloads[k];
        const resObj = mlResults[k];
        
        // Intensity scaling: 0 -> LOW, 1 -> HIGH based on score / 100 max range
        const intensity = Math.min(1.0, Math.max(0.0, resObj.score / 100.0));
        points.push({ lat: p.lat, lng: p.lng, score: resObj.score, intensity });
      }

    } catch (e) {
      logger.warn('Heatmap bulk evaluation failed, returning fallback heuristics');
      // Fallback
      for (const p of mlPayloads) {
        const weatherScore = computeWeatherScore(p.temp, p.rainfall, 10);
        const floraScore   = computeFloraScore(p.flora);
        const seasonScore  = computeSeasonScore(month);
        const score        = computeFinalScore(weatherScore, floraScore, seasonScore, { weather: 0.35, flora: 0.40, season: 0.25 });
        points.push({ lat: p.lat, lng: p.lng, score, intensity: score / 100 });
      }
    }

    const result = { month, points };
    cache.set(cacheKey, result, 3600);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
