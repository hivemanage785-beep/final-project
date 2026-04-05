import { Router } from 'express';
import { z } from 'zod';
import { scoreController } from '../controllers/scoreController.js';
import { scoreLimiter } from '../middleware/rateLimiter.js';

const router = Router();

const ScoreSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  month: z.number().int().min(1).max(12),
});

router.post('/', scoreLimiter, (req, res, next) => {
  const parsed = ScoreSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_INPUT',
      details: parsed.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
    });
  }
  req.body = parsed.data;
  scoreController(req, res, next);
});

export default router;

