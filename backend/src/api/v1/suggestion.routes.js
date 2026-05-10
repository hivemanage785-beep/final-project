import { Router } from 'express';
import { z } from 'zod';
import { getSuggestions } from '../../modules/suggestion/suggestions.controller.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Suggestions
 *   description: Nearby scored location suggestions
 */

const Schema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  month: z.coerce.number().int().min(1).max(12).optional().default(new Date().getMonth() + 1),
});

/**
 * @swagger
 * /api/suggestions:
 *   get:
 *     summary: Get nearby high-scoring location suggestions
 *     tags: [Suggestions]
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema: { type: number }
 *       - in: query
 *         name: lng
 *         required: true
 *         schema: { type: number }
 *       - in: query
 *         name: month
 *         required: false
 *         schema: { type: integer, minimum: 1, maximum: 12 }
 *         description: Month number (defaults to current month)
 *     responses:
 *       200:
 *         description: List of suggested locations with scores
 *       400:
 *         description: Invalid query parameters
 */
router.get('/', async (req, res, next) => {
  const parsed = Schema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'INVALID_INPUT' });
  }
  req.query = parsed.data;
  getSuggestions(req, res, next);
});

export default router;
