import { Router } from 'express';
import { createHarvest, getHarvestTrace, getMyHarvests, verifyBatch } from '../../modules/harvest/harvest.controller.js';
import { auth, admin } from '../../middlewares/auth.js';
import rateLimit from 'express-rate-limit';

const router = Router();

// Strict rate limiting on public trace endpoint to prevent enumeration
const traceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60,
  message: { success: false, error: 'Too many requests. Please try later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Protected: Beekeeper ──────────────────────────────────────────

/**
 * @swagger
 * tags:
 *   name: Harvests
 *   description: Honey harvest and batch traceability
 */

/**
 * @swagger
 * /api/harvests:
 *   post:
 *     summary: Create a new harvest batch
 *     tags: [Harvests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [hive_id, quantity_kg]
 *             properties:
 *               hive_id: { type: string }
 *               quantity_kg: { type: number }
 *               harvest_date: { type: string, format: date }
 *               honey_type: { type: string }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Harvest created
 *       401:
 *         description: Unauthorized
 */
router.post('/', auth, createHarvest);

/**
 * @swagger
 * /api/harvests:
 *   get:
 *     summary: Get all harvests for the authenticated beekeeper
 *     tags: [Harvests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of harvest batches
 *       401:
 *         description: Unauthorized
 */
router.get('/', auth, getMyHarvests);

// ── Admin only: verify a batch ────────────────────────────────────

/**
 * @swagger
 * /api/harvests/verify:
 *   post:
 *     summary: Admin — verify/reject a batch
 *     tags: [Harvests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [batch_id, status]
 *             properties:
 *               batch_id: { type: string }
 *               status:
 *                 type: string
 *                 enum: [verified, rejected]
 *     responses:
 *       200:
 *         description: Batch status updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.post('/verify', auth, admin, verifyBatch);

// ── Public trace — rate limited ───────────────────────────────────

/**
 * @swagger
 * /api/harvests/trace/{batch_id}:
 *   get:
 *     summary: Public — trace a harvest batch by batch ID
 *     tags: [Harvests]
 *     parameters:
 *       - in: path
 *         name: batch_id
 *         required: true
 *         schema: { type: string }
 *         description: Public batch identifier
 *     responses:
 *       200:
 *         description: Batch traceability data
 *       404:
 *         description: Batch not found
 */
router.get('/trace/:batch_id', traceLimiter, getHarvestTrace);
router.get('/:id',             traceLimiter, getHarvestTrace);

export default router;
