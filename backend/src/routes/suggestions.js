import { Router } from 'express';
import { z } from 'zod';
import { getSuggestions } from '../controllers/suggestionsController.js';

const router = Router();

const Schema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  month: z.coerce.number().int().min(1).max(12).optional().default(new Date().getMonth() + 1),
});

router.get('/', async (req, res, next) => {
  const parsed = Schema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'INVALID_INPUT' });
  }
  req.query = parsed.data;
  getSuggestions(req, res, next);
});

export default router;
