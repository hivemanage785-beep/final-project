import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import { rateLimiter, authLimiter, syncLimiter } from './middlewares/rateLimiter.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { requestLogger, errorLogger } from './middlewares/requestLogger.js';
import { logger } from './common/logger.js';
import { swaggerUiServe, swaggerUiSetup } from './config/swagger.js';

import tileRoutes from './api/v1/tile.routes.js';
import scoreRouter from './api/v1/score.routes.js';
import feedbackRouter from './api/v1/feedback.routes.js';
import feedbackUXRouter from './api/v1/feedbackUX.routes.js';
import ndviRouter from './api/v1/ndvi.routes.js';
import hivesRouter from './api/v1/hive.routes.js';
import farmersRouter from './api/v1/farmer.routes.js';
import harvestsRouter from './api/v1/harvest.routes.js';
import syncRouter from './api/v1/sync.routes.js';
import requestsRouter from './api/v1/request.routes.js';
import inspectionsRouter from './api/v1/inspection.routes.js';
import inspectRouter from './api/v1/inspection.routes.js';
import authRouter from './api/v1/auth.routes.js';
import contactRequestRouter, { contactRouter } from './api/v1/contactRequest.routes.js';
import adminRouter from './api/v1/admin.routes.js';
import alertsRouter from './api/v1/alerts.routes.js';

import allocateRouter from './api/v1/allocate.routes.js';
import simulateRouter from './api/v1/simulate.routes.js';
import traceRouter from './api/v1/trace.routes.js';
import savedLocationsRouter from './api/v1/savedLocation.routes.js';
import suggestionsRouter from './api/v1/suggestion.routes.js';
import { auth, admin } from './middlewares/auth.js';

import { connectDB } from './config/db.js';
import { telemetry } from './common/telemetry.js';
import { runTileGeneration } from './common/generateTiles.js';

dotenv.config();

connectDB().then(() => {
  if (process.env.RUN_TILE_GEN === "true") {
    // Run once on startup
    runTileGeneration();

    // Run every 30 minutes
    setInterval(() => {
      runTileGeneration();
    }, 30 * 60 * 1000);
  } else {
    logger.info("Tile generation disabled on startup. Set RUN_TILE_GEN=true to enable.");
  }
});

const app = express();

app.use('/api/docs', swaggerUiServe, swaggerUiSetup);

app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(rateLimiter);
app.use(express.json());
app.use(requestLogger);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now(), env: process.env.NODE_ENV || 'development' });
});

app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok', timestamp: Date.now() });
});

// Public routes (no auth required)
app.use('/api/auth', authLimiter, authRouter);
app.use('/api', tileRoutes);
app.use('/api/score', scoreRouter);
app.use('/api/ndvi', ndviRouter);
app.use('/api/suggestions', suggestionsRouter);

app.use('/api/allocate-hives', allocateRouter);
app.use('/api/simulate', simulateRouter);
app.use('/api/trace-score', traceRouter);
app.use('/api', auth, feedbackUXRouter);
app.use('/api/feedback', auth, feedbackRouter);
app.use('/api/batches', harvestsRouter);

// Tile precompute status (public diagnostic)
app.get('/api/tiles/status', async (req, res) => {
  try {
    const { default: Tile } = await import('./modules/tile/tile.model.js');
    const total = await Tile.countDocuments();
    const latest = await Tile.findOne().sort({ createdAt: -1 }).select('createdAt').lean();
    res.json({ total, lastComputed: latest?.createdAt || null });
  } catch (e) {
    res.json({ total: 0, lastComputed: null, note: 'DB unavailable' });
  }
});

// Protected routes (auth required)
app.use('/api/alerts', auth, alertsRouter);
app.use('/api/hives', auth, hivesRouter);
app.use('/api/saved-locations', auth, savedLocationsRouter);
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

