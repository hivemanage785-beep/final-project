import { allocateHives, optimizeOverTime } from './allocation.service.js';
import { logger } from '../../common/logger.js';
import { generateMonthlyScores } from '../../infrastructure/mlService.js';

/**
 * POST /api/allocate-hives
 *
 * Modified to be async to support fetching ML predictions when time-optimised
 * monthly records are missing.
 */
export async function allocateHivesController(req, res, next) {
  try {
    const { locations, hiveCount, currentHiveLocations = [], useTimeOptimization, months } = req.body;

    logger.info(`[Allocate] hiveCount=${hiveCount} candidates=${locations.length} current=${currentHiveLocations?.length || 0} timeOptimised=${useTimeOptimization}`);

    if (useTimeOptimization) {
      const currentMonth = new Date().getMonth() + 1;
      const numMonths = months || 3;

      for (const loc of locations) {
        if (!Array.isArray(loc.monthlyScores) || loc.monthlyScores.length < numMonths) {
          const baseWeather = {
            avgTemp: loc.temp ?? loc.avgTemp ?? 28,
            avgRain: loc.rainfall ?? loc.avgRain ?? 0,
            avgHumidity: loc.humidity ?? loc.avgHumidity ?? 60
          };
          loc.monthlyScores = await generateMonthlyScores(loc.lat, loc.lng, baseWeather, currentMonth, numMonths);
        }
      }
      const { recommendations } = optimizeOverTime(locations, hiveCount, currentHiveLocations, months);
      return res.status(200).json({
        success: true,
        data: {
          mode: "time-optimized",
          recommendations,
        }
      });
    }

    const recommendations = allocateHives(locations, hiveCount, currentHiveLocations);
    return res.status(200).json({
      success: true,
      data: {
        mode: "static",
        allocations: recommendations,
      }
    });
  } catch (error) {
    logger.error(`[Allocate] Allocation error: ${error.message}`);
    next(error);
  }
}
