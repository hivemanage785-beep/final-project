import { Router } from 'express';
import { z } from 'zod';
import { scoreLimiter } from '../middleware/rateLimiter.js';
import { runSimulation } from '../core/simulationEngine.js';
import { logger } from '../utils/logger.js';

const router = Router();

const LocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  score: z.number().min(0).max(100),
  temp: z.number().optional(),
  humidity: z.number().optional(),
  rainfall: z.number().optional(),
  avgTemp: z.number().optional(),
  avgHumidity: z.number().optional(),
  avgRain: z.number().optional(),
  monthlyScores: z.array(z.number()).optional()
});

const SimulateSchema = z.object({
  locations: z.array(LocationSchema).min(1).max(5000),
  hiveCount: z.number().int().min(1).max(500),
  iterations: z.number().int().min(1).max(500).optional().default(50),
});

router.post('/', scoreLimiter, async (req, res, next) => {
  try {
    const parsed = SimulateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        details: parsed.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const { locations, hiveCount, iterations } = parsed.data;

    logger.info(`[Simulate] hiveCount=${hiveCount} locations=${locations.length} iterations=${iterations}`);

    const result = await runSimulation(locations, hiveCount, iterations, 3);

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    logger.error(`[Simulate] Error: ${error.message}`);
    next(error);
  }
});

export default router;
