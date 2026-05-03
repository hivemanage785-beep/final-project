
import { allocateHives, optimizeOverTime } from './allocationEngine.js';
import { generateMonthlyScores } from '../integrations/mlService.js';
function mulberry32(a) {
  return function () {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}
function sampleIndicesSeeded(n, k, randomFunc) {
  const indices = new Array(n);
  for (let i = 0; i < n; i++) indices[i] = i;

  const limit = Math.min(k, n);
  for (let i = 0; i < limit; i++) {
    const j = i + Math.floor(randomFunc() * (n - i));
    const tmp = indices[i];
    indices[i] = indices[j];
    indices[j] = tmp;
  }
  return indices.slice(0, limit);
}
export async function runSimulation(locations, hiveCount, iterations = 50, months = 3) {
  const safeIterations = Math.max(0, Math.floor(iterations));
  const safeHiveCount = Math.max(0, Math.floor(hiveCount));
  const safeMonths = Math.max(1, Math.floor(months));

  const valid = Array.isArray(locations)
    ? locations.filter(
      (loc) =>
        loc != null &&
        typeof loc.lat === 'number' && isFinite(loc.lat) &&
        typeof loc.lng === 'number' && isFinite(loc.lng) &&
        typeof loc.score === 'number' && isFinite(loc.score)
    )
    : [];

  const effectiveN = Math.min(safeHiveCount, valid.length);

  if (valid.length === 0 || effectiveN === 0 || safeIterations === 0) {
    return {
      random_avg: 0,
      optimized_avg: 0,
      improvement_percent: 0,
      iterations_run: 0,
      hive_count: effectiveN,
      sample_size: valid.length,
    };
  }

  if (valid.length < 2) {
    return {
      message: 'Need multiple locations for meaningful simulation',
      improvement_percent: null,
      iterations_run: 0,
      hive_count: effectiveN,
      sample_size: valid.length,
    };
  }
  const currentMonth = new Date().getMonth() + 1;
  for (const loc of valid) {
    if (!Array.isArray(loc.monthlyScores) || loc.monthlyScores.length < safeMonths) {
      const baseSettings = {
        avgTemp: loc.temp ?? loc.avgTemp ?? 28,
        avgHumidity: loc.humidity ?? loc.avgHumidity ?? 60,
        avgRain: loc.rainfall ?? loc.avgRain ?? 0
      };
      loc.monthlyScores = await generateMonthlyScores(loc.lat, loc.lng, baseSettings, currentMonth, safeMonths);
    }
  }

  const optimizedData = optimizeOverTime(valid, effectiveN, [], safeMonths);
  let optimized_total_once = 0;
  for (const rec of optimizedData.recommendations) {
    optimized_total_once += rec.total_score;
  }

  const randomFunc = mulberry32(12345);
  let total_random_yield = 0;
  let total_optimized_yield = 0;

  for (let iter = 0; iter < safeIterations; iter++) {
    let current_iter_random = 0;

    for (let m = 0; m < safeMonths; m++) {
      const monthLocations = valid.map(loc => ({
        ...loc,
        score: loc.monthlyScores && loc.monthlyScores[m] !== undefined ? loc.monthlyScores[m] : loc.score
      }));
      const sampled = sampleIndicesSeeded(monthLocations.length, effectiveN, randomFunc);
      for (const i of sampled) {
        current_iter_random += monthLocations[i].score;
      }
    }
    total_random_yield += current_iter_random;
    total_optimized_yield += optimized_total_once;
  }
  const random_avg = parseFloat(((total_random_yield / safeIterations) / effectiveN).toFixed(4));
  const optimized_avg = parseFloat(((total_optimized_yield / safeIterations) / effectiveN).toFixed(4));
  const improvement_percent =
    random_avg === 0
      ? 0
      : parseFloat((((optimized_avg - random_avg) / random_avg) * 100).toFixed(2));

  return {
    random_avg,
    optimized_avg,
    improvement_percent,
    iterations_run: safeIterations,
    hive_count: effectiveN,
    sample_size: valid.length,
    months_simulated: safeMonths
  };
}
