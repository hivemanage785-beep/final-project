import axios from 'axios';
import { fetchWeather } from '../integrations/weatherService.js';
import { fetchFlora } from '../integrations/floraService.js';
import { getNDVI, getNDVITrend } from '../integrations/ndviLookup.js';
import { computeWeatherScore, computeFloraScore, computeSeasonScore, deriveOutputs } from '../core/scoringEngine.js';

export async function scoreController(req, res, next) {
  try {
    const { lat, lng, month } = req.body;

    // ── Tamil Nadu boundary guard ──────────────────────────────────────────
    // ML model trained exclusively on TN data (lat 8.0–13.5, lng 76.0–80.5).
    // Scores outside this region are extrapolated and unreliable — reject them.
    const TN_LAT_MIN = 8.0, TN_LAT_MAX = 13.5;
    const TN_LNG_MIN = 76.0, TN_LNG_MAX = 80.5;
    if (
      typeof lat !== 'number' || typeof lng !== 'number' ||
      lat < TN_LAT_MIN || lat > TN_LAT_MAX ||
      lng < TN_LNG_MIN || lng > TN_LNG_MAX
    ) {
      return res.status(400).json({
        success: false,
        error: 'OUT_OF_REGION',
        message: 'This location is outside Tamil Nadu. Score data is only available for Tamil Nadu (lat 8–13.5, lng 76–80.5).'
      });
    }
    // ──────────────────────────────────────────────────────────────────────

    // Fetch integration data
    let weatherData, floraData;
    try {
      weatherData = await fetchWeather(lat, lng);
    } catch (e) {
      return res.status(502).json({ success: false, error: 'Weather service unavailable', message: e.message });
    }

    try {
      floraData = await fetchFlora(lat, lng);
    } catch (e) {
      console.error('Flora fetch failed:', e.message);
      floraData = { floraCount: 0 };
    }

    const ndvi = getNDVI(lat, lng, month);
    let ndviTrend = getNDVITrend(lat, lng, month);
    
    let ndviAvailable = true;
    if (ndvi === null) {
      ndviAvailable = false;
      ndviTrend = 0.0;
    }

    // Prepare payload for ML service
    const mlPayload = {
      lat,
      lng,
      month,
      temp: weatherData.avgTemp,
      humidity: weatherData.avgHumidity,
      rainfall: weatherData.avgRain,
      ndvi: ndvi !== null ? ndvi : 0.5, // neutral value for ML only
      ndvi_trend: ndviTrend || 0.0,
      flora: floraData.floraCount
    };

    // Call ML service
    let mlResponse;

    try {
      const response = await axios.post(`${process.env.ML_SERVICE_URL}/predict`, mlPayload, {
        timeout: 20000
      });
      mlResponse = response.data;
    } catch (err) {
      return res.status(503).json({
        error: "ML service timeout or unavailable"
      });
    }

    // Compute sub-scores for reasoning strings
    const weatherScore = computeWeatherScore(weatherData.avgTemp, weatherData.avgRain, weatherData.avgWind);
    const floraScore = computeFloraScore(floraData.floraCount);
    const seasonScore = computeSeasonScore(month);

    // Create final payload
    const mlWeights = { weather: 0.33, flora: 0.34, season: 0.33 };
    const payload = deriveOutputs(
      mlResponse.score,
      weatherScore,
      floraScore,
      seasonScore,
      month,
      weatherData,
      floraData.floraCount,
      mlWeights
    );

    // Apply ML specific mappings
    payload.riskLevel = mlResponse.risk === 'Low' ? 0 : (mlResponse.risk === 'Moderate' ? 1 : 2);
    payload.mlConfidence = mlResponse.confidence;
    payload.mlWarning = mlResponse.confidence < 0.6 ? 'LOW_CONFIDENCE_PREDICTION' : null;
    payload.mlModel = 'RandomForest_Live';
    payload.dataSource = 'live_inference';
    payload.computedAt = new Date();
    payload.ndvi = ndvi;
    payload.ndvi_available = ndviAvailable;

    // ── Insight layer (deterministic, rule-based) ──────────────────────────
    const s = mlResponse.score;
    let suitability_label, recommendation_text;
    if (s >= 80) {
      suitability_label = 'Optimal';
      recommendation_text = 'Highly recommended for hive placement';
    } else if (s >= 60) {
      suitability_label = 'Good';
      recommendation_text = 'Suitable for hive relocation';
    } else if (s >= 30) {
      suitability_label = 'Moderate';
      recommendation_text = 'Use with caution; conditions are unstable';
    } else {
      suitability_label = 'Poor';
      recommendation_text = 'Not suitable for hive placement';
    }

    const temp = weatherData.avgTemp;
    const rain = weatherData.avgRain;
    const humidity = weatherData.avgHumidity;
    const reasons = [];
    if (temp >= 20 && temp <= 34) reasons.push('favorable temperature supports bee foraging');
    else if (temp > 34)           reasons.push('high temperature may stress bees');
    else                          reasons.push('low temperature may reduce foraging activity');
    if (rain >= 1 && rain <= 5)   reasons.push('moderate rainfall supports flowering conditions');
    else if (rain > 5)            reasons.push('heavy rainfall may disrupt foraging flights');
    else                          reasons.push('low rainfall may limit nectar availability');
    if (humidity >= 50 && humidity <= 80) reasons.push('humidity is within optimal range');
    else if (humidity > 80)       reasons.push('high humidity may reduce nectar quality');
    const reason_text = reasons.map((r, i) => i === 0 ? r.charAt(0).toUpperCase() + r.slice(1) : r).join(', ') + '.';

    payload.suitability_label    = suitability_label;
    payload.recommendation_text  = recommendation_text;
    payload.reason_text          = reason_text;
    // ──────────────────────────────────────────────────────────────────────

    return res.status(200).json({ success: true, data: payload });

  } catch (error) {
    next(error);
  }
}


