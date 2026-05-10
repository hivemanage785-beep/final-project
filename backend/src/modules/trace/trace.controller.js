import { fetchWeather } from '../../infrastructure/weatherService.js';
import { fetchFlora } from '../../infrastructure/floraService.js';
import { getNDVI, getNDVITrend } from '../../infrastructure/ndviLookup.js';
import { predictMLScore } from '../../infrastructure/mlService.js';
import { computeWeatherScore, computeFloraScore, computeSeasonScore, computeFinalScore } from '../score/scoring.service.js';

export async function traceScore(lat, lng, month) {
    // 1. Fetch underlying components directly
    const [w, f] = await Promise.allSettled([
        fetchWeather(lat, lng),
        fetchFlora(lat, lng)
    ]);

    const weatherData = w.status === 'fulfilled' ? w.value : { avgTemp: 28, avgHumidity: 65, avgRain: 3, avgWind: 10 };
    const floraData = f.status === 'fulfilled' ? f.value : { floraCount: 50 };
    
    const ndvi = getNDVI(lat, lng, month);
    const ndvi_trend = getNDVITrend(lat, lng, month);

    // 2. Build ML input matching exact pipeline mapping
    const ml_input = {
        lat: lat,
        lng: lng,
        month: month,
        temp: weatherData.avgTemp,
        humidity: weatherData.avgHumidity,
        rainfall: weatherData.avgRain,
        ndvi: ndvi,
        ndvi_trend: ndvi_trend,
        flora: floraData.floraCount
    };

    // 3. Call ML Inference Endpoint
    let ml_output = null;
    try {
        ml_output = await predictMLScore(ml_input);
    } catch (e) {
        ml_output = { error: e.message };
    }

    // 4. Recompute analytical scoring pipeline parts natively
    const weather_score = computeWeatherScore(ml_input.temp, ml_input.rainfall, weatherData.avgWind);
    const flora_score = computeFloraScore(ml_input.flora);
    const season_score = computeSeasonScore(month);
    
    // Calculate final blended scores
    const mlWeights = { weather: 0.35, flora: 0.40, season: 0.25 };
    const linearFallback = computeFinalScore(weather_score, flora_score, season_score, mlWeights);

    const final_score = (ml_output && ml_output.score) ? ml_output.score : linearFallback;

    return {
        weather: weatherData,
        ndvi: ndvi,
        ndvi_trend: ndvi_trend,
        ml_input: ml_input,
        ml_output: ml_output,
        weather_score: weather_score,
        flora_score: flora_score,
        season_score: season_score,
        final_score: final_score
    };
}
