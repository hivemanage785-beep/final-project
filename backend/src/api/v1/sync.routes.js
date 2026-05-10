import { Router } from 'express';
import { processSyncQueue } from '../../modules/sync/sync.controller.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Sync
 *   description: Offline queue synchronization
 */

/**
 * @swagger
 * /api/sync:
 *   post:
 *     summary: Process the offline sync queue for the authenticated user
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               queue:
 *                 type: array
 *                 items: { type: object }
 *     responses:
 *       200:
 *         description: Sync processed
 *       401:
 *         description: Unauthorized
 */
router.post('/', processSyncQueue);

export default router;
