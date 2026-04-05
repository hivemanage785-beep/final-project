import axios from 'axios';
import cache from '../lib/cache.js';
import { logger } from '../utils/logger.js';

export async function fetchWeather(lat, lng) {
  const cacheKey = `weather:${lat.toFixed(2)}:${lng.toFixed(2)}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude: lat,
        longitude: lng,
        daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max',
        timezone: 'Asia/Kolkata',
        forecast_days: 7,
      }
    });

    const daily = response.data.daily;
    if (!daily) throw new Error('Invalid response structure');

    let sumTemp = 0;
    let sumRain = 0;
    let sumWind = 0;
    
    for (let i = 0; i < daily.time.length; i++) {
      const avgDailyTemp = (daily.temperature_2m_max[i] + daily.temperature_2m_min[i]) / 2;
      sumTemp += avgDailyTemp;
      sumRain += daily.precipitation_sum[i];
      sumWind += daily.windspeed_10m_max[i];
    }
    
    const count = daily.time.length;
    const result = {
      avgTemp: sumTemp / count,
      avgRain: sumRain / count,
      avgWind: sumWind / count,
    };

    cache.set(cacheKey, result);
    return result;
  } catch (error) {
    logger.error('Weather fetch error', error);
    throw new Error('Weather fetch failed');
  }
}
