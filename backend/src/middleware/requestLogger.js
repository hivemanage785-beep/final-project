import { logger } from '../utils/logger.js';

export function requestLogger(req, res, next) {
  const start = Date.now();
  const userId = req.user?.id || 'anonymous';
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} | user=${userId} | status=${res.statusCode} | ${duration}ms`);
  });
  
  next();
}

export function errorLogger(err, req, res, next) {
  const userId = req.user?.id || 'anonymous';
  logger.error(`[${new Date().toISOString()}] ERROR ${req.method} ${req.originalUrl} | user=${userId} | ${err.message}`);
  logger.error(err.stack);
  next(err);
}
