import axios from 'axios';
import cache from '../common/cache.js';
import { logger } from '../common/logger.js';

/**
 * Returns the YYYY-MM-DD start and end dates for a given month in a given year.
 */
function monthDateRange(year, month) {
  const pad = (n) => String(n).padStart(2, '0');
  const start = `${year}-${pad(month)}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${pad(month)}-${lastDay}`;
  return { start, end };
}

/**
 * Accumulate daily weather values from an Open-Meteo daily response object.
 */
function accumulateDailyStats(daily, sums, counts) {
  for (let i = 0; i < daily.time.length; i++) {
    const tMax = daily.temperature_2m_max[i];
    const tMin = daily.temperature_2m_min[i];
    const rSum = daily.precipitation_sum[i];
    const wMax = daily.windspeed_10m_max[i];
    const hMax = daily.relative_humidity_2m_max[i];

    if (tMax != null && tMin != null && rSum != null && wMax != null && hMax != null) {
      sums.temp     += (tMax + tMin) / 2;
      sums.rain     += rSum;
      sums.wind     += wMax;
      sums.humidity += hMax;
      counts.days++;
    }
  }
}

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

/**
 * Fetches real historical climate normals for a specific month at a location.
 *
 * Strategy: Query Open-Meteo's archive API for the same calendar month across
 * the last 3 complete years (e.g. for month=7, query Jul 2022 + Jul 2023 + Jul 2024),
 * then average all daily readings into a single representative climate object.
 *
 * This completely replaces the hardcoded seasonal offset table in generateMonthlyScores()
 * and provides coordinate-specific, real historical data for any month of the year.
 *
 * Cache TTL: 7 days — historical data never changes.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {number} month - 1-12
 * @returns {Promise<{avgTemp, avgRain, avgWind, avgHumidity, source: 'historical-archive'}>}
 */
export async function fetchHistoricalMonthlyClimate(lat, lng, month) {
  const cacheKey = `climate:${lat.toFixed(2)}:${lng.toFixed(2)}:m${month}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // Use the last 3 complete calendar years as the baseline
  const currentYear = new Date().getFullYear();
  const yearsToSample = [currentYear - 1, currentYear - 2, currentYear - 3];

  const sums   = { temp: 0, rain: 0, wind: 0, humidity: 0 };
  const counts = { days: 0, years: 0 };

  const dailyFields = [
    'temperature_2m_max',
    'temperature_2m_min',
    'precipitation_sum',
    'windspeed_10m_max',
    'relative_humidity_2m_max',
  ].join(',');

  for (const year of yearsToSample) {
    const { start, end } = monthDateRange(year, month);
    try {
      const response = await axios.get('https://archive-api.open-meteo.com/v1/archive', {
        params: {
          latitude:  lat,
          longitude: lng,
          start_date: start,
          end_date:   end,
          daily:      dailyFields,
          timezone:   'Asia/Kolkata',
        },
        timeout: 8000,
      });

      const daily = response.data?.daily;
      if (!daily || !daily.time || daily.time.length === 0) {
        logger.warn(`[Climate] Empty archive response for ${year}-${month} @ ${lat},${lng}`);
        continue;
      }

      accumulateDailyStats(daily, sums, counts);
      counts.years++;
      logger.info(`[Climate] Loaded ${daily.time.length} days from ${start}→${end} @ ${lat},${lng}`);
    } catch (err) {
      logger.warn(`[Climate] Archive fetch failed for ${year}-${month} @ ${lat},${lng}: ${err.message}`);
      // Continue — we'll still average whatever years succeeded
    }
  }

  if (counts.days === 0) {
    throw new Error(`Historical climate unavailable for month=${month} @ ${lat},${lng} — all ${yearsToSample.length} year requests failed`);
  }

  const result = {
    avgTemp:     Number((sums.temp     / counts.days).toFixed(2)),
    avgRain:     Number((sums.rain     / counts.days).toFixed(2)),
    avgWind:     Number((sums.wind     / counts.days).toFixed(2)),
    avgHumidity: Number((sums.humidity / counts.days).toFixed(2)),
    source:      'historical-archive',
    yearsUsed:   counts.years,
    month,
  };

  // 7-day TTL — historical normals are stable and rarely need refreshing
  cache.set(cacheKey, result, 7 * 24 * 3600);
  logger.info(`[Climate] Normals cached for month=${month} @ ${lat},${lng} (${counts.years} yrs, ${counts.days} days)`);
  return result;
}
