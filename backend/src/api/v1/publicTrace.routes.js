/**
 * Public Harvest Trace Routes — No Authentication Required
 *
 * SECURITY NOTE: This router exposes ONLY the public consumer-facing
 * traceability endpoints. It is intentionally mounted WITHOUT auth middleware
 * at /api/batches so that mobile users scanning QR codes can access provenance
 * data without a Firebase session.
 *
 * Protected harvest management routes (create, list, verify) remain exclusively
 * under /api/harvests with full auth middleware in server.js.
 */
import { Router } from 'express';
import { getHarvestTrace } from '../../modules/harvest/harvest.controller.js';
import { getHiveTrace } from '../../modules/hive/hive.controller.js';
import rateLimit from 'express-rate-limit';

const router = Router();

const traceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60,
  message: { success: false, error: 'Too many requests. Please try later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public trace by hive UUID — must be registered BEFORE /:id to avoid shadowing
router.get('/trace/hive/:id',     traceLimiter, getHiveTrace);

// Public trace by batch public ID (HT-XXXXXX format)
router.get('/trace/:batch_id',    traceLimiter, getHarvestTrace);

// Public trace by internal harvest ID fallback
router.get('/:id',                traceLimiter, getHarvestTrace);

export default router;
