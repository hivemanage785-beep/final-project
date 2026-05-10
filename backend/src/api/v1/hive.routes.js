import { Router } from 'express';
import { getHives, createHive, updateHive, deleteHive } from '../../modules/hive/hive.controller.js';
import { validate } from '../../middlewares/validate.js';
import { createHiveSchema, updateHiveSchema } from '../../modules/core/dtos/index.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Hives
 *   description: Beekeeper hive management
 */

/**
 * @swagger
 * /api/hives:
 *   get:
 *     summary: Get all hives for the authenticated beekeeper
 *     tags: [Hives]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of hives
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items: { type: object }
 *       401:
 *         description: Unauthorized
 */
router.get('/', getHives);

/**
 * @swagger
 * /api/hives:
 *   post:
 *     summary: Create a new hive
 *     tags: [Hives]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [hive_id, location]
 *             properties:
 *               hive_id:
 *                 type: string
 *               location:
 *                 type: string
 *               health_status:
 *                 type: string
 *                 enum: [good, fair, poor]
 *               queen_status:
 *                 type: string
 *                 enum: [present, missing, unknown]
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Hive created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', validate(createHiveSchema), createHive);

/**
 * @swagger
 * /api/hives/{id}:
 *   put:
 *     summary: Update a hive by ID
 *     tags: [Hives]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Hive MongoDB ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               health_status:
 *                 type: string
 *                 enum: [good, fair, poor]
 *               queen_status:
 *                 type: string
 *                 enum: [present, missing, unknown]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Hive updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Hive not found
 */
router.put('/:id', validate(updateHiveSchema), updateHive);

/**
 * @swagger
 * /api/hives/{id}:
 *   delete:
 *     summary: Delete a hive by ID
 *     tags: [Hives]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Hive MongoDB ID
 *     responses:
 *       200:
 *         description: Hive deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Hive not found
 */
router.delete('/:id', deleteHive);

export default router;
