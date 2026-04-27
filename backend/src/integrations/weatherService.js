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
        daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,relative_humidity_2m_max',
        timezone: 'Asia/Kolkata',
        forecast_days: 7,
      },
      timeout: 4000 // Timeout protection
    });

    const daily = response.data.daily;
    if (!daily || !daily.time || daily.time.length === 0) throw new Error('Invalid response structure');

    let sumTemp = 0, sumRain = 0, sumWind = 0, sumHumidity = 0;
    let validDays = 0;
    
    for (let i = 0; i < daily.time.length; i++) {
        const tMax = daily.temperature_2m_max[i];
        const tMin = daily.temperature_2m_min[i];
        const rSum = daily.precipitation_sum[i];
        const wMax = daily.windspeed_10m_max[i];
        const hMax = daily.relative_humidity_2m_max[i];

        if (tMax != null && tMin != null && rSum != null && wMax != null && hMax != null) {
            const avgDailyTemp = (tMax + tMin) / 2;
            sumTemp += avgDailyTemp;
            sumRain += rSum;
            sumWind += wMax;
            sumHumidity += hMax;
            validDays++;
        }
    }
    
    if (validDays === 0) throw new Error('No valid numbers output');

    const result = {
      avgTemp: Number((sumTemp / validDays).toFixed(2)),
      avgRain: Number((sumRain / validDays).toFixed(2)),
      avgWind: Number((sumWind / validDays).toFixed(2)),
      avgHumidity: Number((sumHumidity / validDays).toFixed(2)),
    };

    cache.set(cacheKey, result, 3600);
    return result;

  } catch (error) {
    logger.warn(`[Weather] Fetch failed for ${lat},${lng}: ${error.message}`);
    throw new Error(`Weather fetch failed: ${error.message}`);
  }
}
