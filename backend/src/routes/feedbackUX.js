import { Router } from 'express';
import FeedbackLog from '../models/FeedbackLog.js';

const router = Router();

router.post('/feedback', async (req, res, next) => {
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
      lat, lng, temperature, humidity, rainfall, predicted_score, actual_outcome
    });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/feedback-history — return recent feedback entries for display
router.get('/feedback-history', async (req, res) => {
  try {
    const total = await FeedbackLog.countDocuments();
    const entries = await FeedbackLog.find()
      .sort({ _id: -1 })
      .limit(50)
      .lean();
    return res.json({ success: true, total, entries });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
