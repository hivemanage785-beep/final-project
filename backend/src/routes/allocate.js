import { Router } from 'express';
import { z } from 'zod';
import { allocateHivesController } from '../controllers/allocateController.js';
import { scoreLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// ── Input schema ──────────────────────────────────────────────────────────────
const LocationSchema = z.object({
  lat:   z.number().min(-90).max(90),
  lng:   z.number().min(-180).max(180),
  score: z.number().min(0).max(100),
  monthlyScores: z.array(z.number().min(0).max(100)).max(12).optional(),
});

const CurrentLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const AllocateSchema = z.object({
  locations:            z.array(LocationSchema).min(1).max(5000),
  hiveCount:            z.number().int().min(1).max(500),
  currentHiveLocations: z.array(CurrentLocationSchema).max(500).optional(),
  useTimeOptimization:  z.boolean().optional().default(false),
  months:               z.number().int().min(1).max(12).optional().default(3),
});

// ── POST /api/allocate-hives ──────────────────────────────────────────────────
router.post('/', scoreLimiter, (req, res, next) => {
  const parsed = AllocateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error:   'INVALID_INPUT',
      details: parsed.error.errors.map(e => ({
        field:   e.path.join('.'),
        message: e.message,
      })),
    });
  }
  req.body = parsed.data;
  allocateHivesController(req, res, next);
});

export default router;
