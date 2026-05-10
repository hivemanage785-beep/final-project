import { Router } from 'express';
import { fetchNDVI } from '../../infrastructure/ndviService.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: NDVI
 *   description: Normalized Difference Vegetation Index lookup
 */

/**
 * @swagger
 * /api/ndvi:
 *   get:
 *     summary: Fetch NDVI data for a coordinate and date
 *     tags: [NDVI]
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema: { type: number }
 *         description: Latitude
 *       - in: query
 *         name: lng
 *         required: true
 *         schema: { type: number }
 *         description: Longitude
 *       - in: query
 *         name: date
 *         required: false
 *         schema: { type: string, format: date-time }
 *         description: ISO date string (defaults to now)
 *     responses:
 *       200:
 *         description: NDVI result
 *       400:
 *         description: Invalid lat or lng
 */
router.get('/', async (req, res, next) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const dateQuery = req.query.date || new Date().toISOString();

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'Valid lat and lng required' });
    }

    const ndviResult = await fetchNDVI(lat, lng, dateQuery);
    return res.status(200).json(ndviResult);
  } catch (error) {
    next(error);
  }
});

export default router;
