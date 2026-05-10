import { Router } from 'express';
import { z } from 'zod';
import { scoreController } from '../../modules/score/score.controller.js';
import { scoreLimiter } from '../../middlewares/rateLimiter.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Score
 *   description: ML-powered flowering score prediction
 */

const ScoreSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  month: z.number().int().min(1).max(12),
});

/**
 * @swagger
 * /api/score:
 *   post:
 *     summary: Get a flowering suitability score for a location and month
 *     tags: [Score]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [lat, lng, month]
 *             properties:
 *               lat:
 *                 type: number
 *                 minimum: -90
 *                 maximum: 90
 *               lng:
 *                 type: number
 *                 minimum: -180
 *                 maximum: 180
 *               month:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 12
 *     responses:
 *       200:
 *         description: Flowering score result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 score: { type: number }
 *                 flowering_level:
 *                   type: string
 *                   enum: [Low, Medium, High]
 *                 confidence: { type: number }
 *       400:
 *         description: Validation error
 */
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

