import { Router } from 'express';
import { z } from 'zod';
import { allocateHivesController } from '../../modules/allocation/allocate.controller.js';
import { scoreLimiter } from '../../middlewares/rateLimiter.js';
const router = Router();
const LocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  score: z.number().min(0).max(100),
  monthlyScores: z.array(z.number().min(0).max(100)).max(12).optional(),
});
const CurrentLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
const AllocateSchema = z.object({
  locations: z.array(LocationSchema).min(1).max(5000),
  hiveCount: z.number().int().min(1).max(500),
  currentHiveLocations: z.array(CurrentLocationSchema).max(500).optional(),
  useTimeOptimization: z.boolean().optional().default(false),
  months: z.number().int().min(1).max(12).optional().default(3),
});
/**
 * @swagger
 * tags:
 *   name: Allocate
 *   description: Optimal hive placement using scoring data
 */

/**
 * @swagger
 * /api/allocate-hives:
 *   post:
 *     summary: Compute optimal hive placement for a set of scored locations
 *     tags: [Allocate]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [locations, hiveCount]
 *             properties:
 *               locations:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     lat: { type: number }
 *                     lng: { type: number }
 *                     score: { type: number }
 *                     monthlyScores:
 *                       type: array
 *                       items: { type: number }
 *               hiveCount:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 500
 *               currentHiveLocations:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     lat: { type: number }
 *                     lng: { type: number }
 *               useTimeOptimization:
 *                 type: boolean
 *               months:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 12
 *     responses:
 *       200:
 *         description: Allocation result with recommended hive positions
 *       400:
 *         description: Validation error
 */
router.post('/', scoreLimiter, (req, res, next) => {
  const parsed = AllocateSchema.safeParse(req.body);
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
  req.body = parsed.data;
  allocateHivesController(req, res, next);
});
export default router;
