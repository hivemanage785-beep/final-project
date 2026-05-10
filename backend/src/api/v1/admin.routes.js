import { Router } from 'express';
import { 
  getPendingRequests, 
  approveRequest, 
  getAllFarmers,
  updateFarmerStatus,
  deleteFarmer,
  getAllBeekeepers,
  verifyBeekeeper
} from '../../modules/admin/admin.controller.js';

const router = Router();

/**
 * ── CONTACT REQUESTS ────────────────────────────────────────────
 */

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin-only management endpoints
 */

/**
 * @swagger
 * /api/admin/requests:
 *   get:
 *     summary: Get all pending contact requests
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending requests
 *       403:
 *         description: Admin access required
 */
router.get('/requests', getPendingRequests);

/**
 * @swagger
 * /api/admin/requests/{id}/approve:
 *   post:
 *     summary: Approve a contact request
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Request approved
 *       403:
 *         description: Admin access required
 */
router.post('/requests/:id/approve', approveRequest);

/**
 * ── FARMER MANAGEMENT ────────────────────────────────────────────
 */

/**
 * @swagger
 * /api/admin/farmers:
 *   get:
 *     summary: Get all farmers
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all farmers
 */
router.get('/farmers', getAllFarmers);

/**
 * @swagger
 * /api/admin/farmers/{id}/status:
 *   patch:
 *     summary: Update a farmer's status (approve/reject)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, pending, rejected]
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch('/farmers/:id/status', updateFarmerStatus);

/**
 * @swagger
 * /api/admin/farmers/{id}:
 *   delete:
 *     summary: Delete a farmer
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Farmer deleted
 */
router.delete('/farmers/:id', deleteFarmer);

/**
 * ── BEEKEEPER MANAGEMENT ──────────────────────────────────────────
 */

/**
 * @swagger
 * /api/admin/beekeepers:
 *   get:
 *     summary: Get all registered beekeepers
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of beekeepers
 */
router.get('/beekeepers', getAllBeekeepers);

/**
 * @swagger
 * /api/admin/beekeepers/{id}/verify:
 *   patch:
 *     summary: Verify a beekeeper account
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Beekeeper verified
 */
router.patch('/beekeepers/:id/verify', verifyBeekeeper);

export default router;
