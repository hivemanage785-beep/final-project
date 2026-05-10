import { Router } from 'express';
import FeedbackLog from '../../modules/feedback/feedbackLog.model.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Feedback
 *   description: UX feedback and prediction outcome logging
 */

/**
 * @swagger
 * /api/feedback:
 *   post:
 *     summary: Log a UX feedback entry with actual outcome
 *     tags: [Feedback]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [lat, lng, temperature, humidity, rainfall, predicted_score, actual_outcome]
 *             properties:
 *               lat: { type: number }
 *               lng: { type: number }
 *               temperature: { type: number }
 *               humidity: { type: number }
 *               rainfall: { type: number }
 *               predicted_score: { type: number }
 *               actual_outcome:
 *                 type: string
 *                 enum: [good, fair, poor]
 *     responses:
 *       200:
 *         description: Feedback logged
 *       400:
 *         description: Missing required fields
 */
router.post('/feedback', async (req, res, next) => {
  if (!req.user || !req.user.uid) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const { lat, lng, temperature, humidity, rainfall, predicted_score, actual_outcome } = req.body;
  
  // If actual_outcome is missing, this might be the old feedback endpoint payload.
  // Pass it to the next router to avoid breaking existing functionality.
  if (actual_outcome === undefined) {
    return next();
  }

  if (lat == null || lng == null || temperature == null || humidity == null || rainfall == null || predicted_score == null) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  try {
    await FeedbackLog.create({
      lat, lng, temperature, humidity, rainfall, predicted_score, actual_outcome, uid: req.user.uid
    });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/feedback-history:
 *   get:
 *     summary: Get recent feedback log entries
 *     tags: [Feedback]
 *     responses:
 *       200:
 *         description: List of feedback entries
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 total: { type: integer }
 *                 entries: { type: array, items: { type: object } }
 */
// GET /api/feedback-history — return recent feedback entries for display
router.get('/feedback-history', async (req, res) => {
  if (!req.user || !req.user.uid) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const total = await FeedbackLog.countDocuments({ uid: req.user.uid });
    const entries = await FeedbackLog.find({ uid: req.user.uid })
      .sort({ _id: -1 })
      .limit(50)
      .lean();
    return res.json({ success: true, total, entries });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
