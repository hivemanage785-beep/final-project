import express from 'express';
import { getInspections, createInspection } from '../../modules/inspection/inspection.controller.js';
import { validate } from '../../middlewares/validate.js';
import { createInspectionSchema } from '../../modules/core/dtos/index.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Inspections
 *   description: Hive inspection records
 */

/**
 * @swagger
 * /api/inspections:
 *   get:
 *     summary: Get all inspections for the authenticated beekeeper
 *     tags: [Inspections]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of inspection records
 *       401:
 *         description: Unauthorized
 */
router.get('/', getInspections);

/**
 * @swagger
 * /api/inspections:
 *   post:
 *     summary: Log a new hive inspection
 *     tags: [Inspections]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [hive_id, date]
 *             properties:
 *               hive_id: { type: string }
 *               date: { type: string, format: date }
 *               health_status:
 *                 type: string
 *                 enum: [good, fair, poor]
 *               queen_status:
 *                 type: string
 *                 enum: [present, missing, unknown]
 *               notes: { type: string }
 *               frames_of_honey: { type: number }
 *               frames_of_brood: { type: number }
 *     responses:
 *       201:
 *         description: Inspection created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', validate(createInspectionSchema), createInspection);

export default router;
