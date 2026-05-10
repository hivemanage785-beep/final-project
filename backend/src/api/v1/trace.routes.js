import express from 'express';
import { traceScore } from '../../modules/trace/trace.controller.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Trace Score
 *   description: Historical scoring trace for a location
 */

/**
 * @swagger
 * /api/trace-score:
 *   get:
 *     summary: Get a score trace for a location and month
 *     tags: [Trace Score]
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
 *         required: true
 *         schema: { type: integer, minimum: 1, maximum: 12 }
 *     responses:
 *       200:
 *         description: Trace score data
 *       400:
 *         description: Invalid parameters
 */
router.get('/', async (req, res, next) => {
    try {
        const lat = parseFloat(req.query.lat);
        const lng = parseFloat(req.query.lng);
        const month = parseInt(req.query.month, 10);
        
        if (isNaN(lat) || isNaN(lng) || isNaN(month)) {
            return res.status(400).json({ success: false, error: "Invalid lat, lng, or month parameters" });
        }

        const trace = await traceScore(lat, lng, month);
        res.json({ success: true, data: trace });
    } catch (e) {
        next(e);
    }
});

export default router;
