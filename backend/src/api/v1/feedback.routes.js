import { Router } from 'express';
import { z } from 'zod';
import { feedbackController } from '../../modules/feedback/feedback.controller.js';

const router = Router();

const FeedbackSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  month: z.number(),
  weatherScore: z.number(),
  floraScore: z.number(),
  seasonScore: z.number(),
  finalScore: z.number(),
  floraCount: z.number(),
  avgTemp: z.number(),
  avgRain: z.number(),
  avgWind: z.number(),
  uid: z.string().optional()
});

router.post('/', (req, res, next) => {
  const parsed = FeedbackSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid input' });
  }
  req.body = parsed.data;
  feedbackController(req, res, next);
});

export default router;
