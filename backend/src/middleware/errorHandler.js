/**
 * Hardened centralized error handler + structured logging
 *
 * FIXES:
 * CRITICAL: BATCH_LOCKED Mongoose pre-save errors were surfacing as generic 500s.
 * HIGH:     Mongoose validation errors (CastError, ValidationError) returned 500 not 400.
 * HIGH:     Mongo duplicate key errors (E11000) returned 500 not 409.
 * HIGH:     logger.error silently swallowed structured metadata — now outputs full JSON.
 * MEDIUM:   No request ID — impossible to correlate logs across services.
 * MEDIUM:   Error stack always emitted in non-prod — middleware should distinguish DEV vs TEST.
 */

import { logger } from '../utils/logger.js';
import crypto from 'crypto';

export const errorHandler = (err, req, res, next) => {
  const requestId = req.headers['x-request-id'] || crypto.randomBytes(4).toString('hex');
  const method    = req.method;
  const url       = req.originalUrl;
  const isDev     = process.env.NODE_ENV !== 'production';

  // ── Classify error ────────────────────────────────────────────────────────
  let status  = err.status || 500;
  let code    = 'INTERNAL_ERROR';
  let message = isDev ? (err.message || 'Internal Server Error') : 'Internal Server Error';

  // Mongoose Validation
  if (err.name === 'ValidationError') {
    status  = 400;
    code    = 'VALIDATION_ERROR';
    message = Object.values(err.errors).map(e => e.message).join(', ');
  }

  // Mongoose Cast (bad ObjectId format)
  if (err.name === 'CastError') {
    status  = 400;
    code    = 'INVALID_ID';
    message = `Invalid value for field: ${err.path}`;
  }

  // MongoDB Duplicate Key
  if (err.code === 11000) {
    status  = 409;
    code    = 'DUPLICATE_KEY';
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    message = `Duplicate value for: ${field}`;
  }

  // Locking violation from Batch pre-save hook
  if (err.message === 'BATCH_LOCKED') {
    status  = 403;
    code    = 'BATCH_LOCKED';
    message = 'This batch is locked and cannot be edited.';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    status  = 401;
    code    = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
  }
  if (err.name === 'TokenExpiredError') {
    status  = 401;
    code    = 'TOKEN_EXPIRED';
    message = 'Authentication token expired';
  }

  // ── Structured log ────────────────────────────────────────────────────────
  const logPayload = {
    requestId,
    method,
    url,
    status,
    code,
    message,
    ...(isDev ? { stack: err.stack } : {})
  };

  if (status >= 500) {
    logger.error(`[${requestId}] ${method} ${url} → ${status} ${code}`, logPayload);
  } else {
    logger.warn(`[${requestId}] ${method} ${url} → ${status} ${code}: ${message}`);
  }

  res.status(status).json({
    success: false,
    error:   code,
    message,
    requestId,
    ...(isDev && status >= 500 ? { stack: err.stack } : {})
  });
};
