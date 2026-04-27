import axios from 'axios';
import { fetchWeather } from '../integrations/weatherService.js';
import { fetchFlora } from '../integrations/floraService.js';
import { getNDVI, getNDVITrend } from '../integrations/ndviLookup.js';
import { computeWeatherScore, computeFloraScore, computeSeasonScore, deriveOutputs } from '../core/scoringEngine.js';

export async function scoreController(req, res, next) {
  try {
    const { lat, lng, month } = req.body;

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
      return res.status(502).json({ success: false, error: 'Flora service unavailable', message: e.message });
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
      const mlReq = await axios.post('http://localhost:8000/predict', mlPayload, { timeout: 8000 });
      mlResponse = mlReq.data;
    } catch (e) {
      console.error("ML Service Error:", e.message);
      return res.status(502).json({ success: false, error: 'ML Prediction service unavailable', message: e.message });
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

    return res.status(200).json({ success: true, data: payload });

  } catch (error) {
    next(error);
  }
}


