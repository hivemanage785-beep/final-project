import { Router } from 'express';
import { createHarvest, getHarvestTrace, getMyHarvests, verifyBatch } from '../controllers/harvestController.js';
import { auth, admin } from '../middleware/auth.js';
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
router.post('/', auth, createHarvest);
router.get('/', auth, getMyHarvests);

// ── Admin only: verify a batch ────────────────────────────────────
router.post('/verify', auth, admin, verifyBatch);

// ── Public trace — rate limited ───────────────────────────────────
router.get('/trace/:batch_id', traceLimiter, getHarvestTrace);
router.get('/:id',             traceLimiter, getHarvestTrace);

export default router;
