import { Router } from 'express';
import {
  getSavedLocations,
  createSavedLocation,
  deleteSavedLocation,
} from '../../modules/location/SavedLocation.controller.js';
import { auth } from '../../middlewares/auth.js'; // Assuming auth is mapped here, index.js injects auth directly currently

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Saved Locations
 *   description: User-saved map locations
 */

// Simple validation middleware for the route
const validateCreatePayload = (req, res, next) => {
  const { id, lat, lng, score, month } = req.body;
  if (!id || lat == null || lng == null || score == null || !month) {
    return res.status(400).json({ success: false, error: 'Missing required fields: id, lat, lng, score, month' });
  }
  next();
};

/**
 * @swagger
 * /api/saved-locations:
 *   get:
 *     summary: Get all saved locations for the authenticated user
 *     tags: [Saved Locations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of saved locations
 *       401:
 *         description: Unauthorized
 */
router.get('/', getSavedLocations);

/**
 * @swagger
 * /api/saved-locations:
 *   post:
 *     summary: Save a new map location
 *     tags: [Saved Locations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id, lat, lng, score, month]
 *             properties:
 *               id: { type: string }
 *               lat: { type: number }
 *               lng: { type: number }
 *               score: { type: number }
 *               month: { type: integer, minimum: 1, maximum: 12 }
 *               label: { type: string }
 *     responses:
 *       201:
 *         description: Location saved
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized
 */
router.post('/', validateCreatePayload, createSavedLocation);

/**
 * @swagger
 * /api/saved-locations/{id}:
 *   delete:
 *     summary: Delete a saved location by ID
 *     tags: [Saved Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Saved location ID
 *     responses:
 *       200:
 *         description: Location deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Location not found
 */
router.delete('/:id', deleteSavedLocation);

export default router;
