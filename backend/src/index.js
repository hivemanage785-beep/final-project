import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import { rateLimiter, authLimiter, syncLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger, errorLogger } from './middleware/requestLogger.js';
import { logger } from './utils/logger.js';

import scoreRouter from './routes/score.js';
import heatmapRouter from './routes/heatmap.js';
import { getHeatmapGrid } from './controllers/heatmapGridController.js';
import feedbackRouter from './routes/feedback.js';
import ndviRouter from './routes/ndvi.js';
import hivesRouter from './routes/hives.js';
import farmersRouter from './routes/farmers.js';
import harvestsRouter from './routes/harvests.js';
import syncRouter from './routes/sync.js';
import requestsRouter from './routes/requests.js';
import inspectionsRouter from './routes/inspections.js';
import authRouter from './routes/auth.js';
import contactRequestRouter, { contactRouter } from './routes/contactRequests.js';
import adminRouter from './routes/admin.js';
import { auth, admin } from './middleware/auth.js';

import { connectDB } from './config/db.js';
import { startTileScheduler } from './services/tileScheduler.js';
import { GeoTile } from './models/GeoTile.js';
import { telemetry } from './utils/telemetry.js';

dotenv.config();

connectDB().then(() => {
  // Start background tile precomputation after DB is ready
  startTileScheduler();
});

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(rateLimiter);
app.use(express.json());
app.use(requestLogger);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now(), env: process.env.NODE_ENV || 'development' });
});

// Public routes (no auth required)
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/score', scoreRouter);
app.use('/api/heatmap', heatmapRouter);
app.get('/api/heatmap-grid', getHeatmapGrid);
app.use('/api/ndvi', ndviRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/batches', harvestsRouter);

// Tile precompute status (public diagnostic)
app.get('/api/tiles/status', async (req, res) => {
  try {
    const total   = await GeoTile.countDocuments();
    const fresh   = await GeoTile.countDocuments({ ttlExpires: { $gt: new Date() } });
    const stale   = total - fresh;
    const latest  = await GeoTile.findOne().sort({ computedAt: -1 }).select('computedAt').lean();
    res.json({ total, fresh, stale, lastComputed: latest?.computedAt || null });
  } catch (e) {
    res.json({ total: 0, fresh: 0, stale: 0, lastComputed: null, note: 'DB unavailable' });
  }
});

// Protected routes (auth required)
app.use('/api/hives', auth, hivesRouter);
app.use('/api/farmers', auth, farmersRouter);
app.use('/api/harvests', auth, harvestsRouter);
app.use('/api/inspections', auth, inspectionsRouter);
app.use('/api/sync', auth, (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => telemetry.trackLatency(Date.now() - start));
  next();
}, syncLimiter, syncRouter);

app.use('/api/requests', auth, requestsRouter);
app.use('/api/contact-request', auth, contactRequestRouter);
app.use('/api/contact', auth, contactRouter);

// ── Admin Dashboard Isolated Routes ───────────────────────────────────
app.use('/api/admin', auth, admin, adminRouter);

// ── Observability: Admin Diagnostic ───────────────────────────────────
app.get('/api/admin/telemetry', auth, (req, res) => {
   // In production, add a real admin check here: if (!req.user.isAdmin) return res.sendStatus(403);
   res.json({ success: true, data: telemetry.getSummary() });
});

app.use(errorLogger);
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  logger.info(`Backend listening on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

