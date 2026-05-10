import { logger } from './logger.js';

const metrics = {
  sync_success: 0,
  sync_failure: 0,
  ml_low_confidence: 0,
  api_latency_ms: [],
  qr_scans_total: 0
};

export const telemetry = {
  trackSync: (success) => {
    if (success) metrics.sync_success++;
    else metrics.sync_failure++;
    logger.info(`[TELEMETRY] Sync Event: ${success ? 'SUCCESS' : 'FAILURE'}`);
  },

  trackML: (confidence) => {
    if (confidence < 0.60) {
      metrics.ml_low_confidence++;
      logger.warn(`[TELEMETRY] ML Low Confidence Detected: ${confidence}`);
    }
  },

  trackLatency: (ms) => {
    metrics.api_latency_ms.push(ms);
    if (metrics.api_latency_ms.length > 100) metrics.api_latency_ms.shift();
  },

  trackQRScan: () => {
    metrics.qr_scans_total++;
    logger.info(`[TELEMETRY] QR Scan Event. Total: ${metrics.qr_scans_total}`);
  },

  getSummary: () => {
    const avgLatency = metrics.api_latency_ms.length > 0 
      ? metrics.api_latency_ms.reduce((a, b) => a + b, 0) / metrics.api_latency_ms.length 
      : 0;

    return {
      ...metrics,
      avg_latency_ms: Math.round(avgLatency),
      api_latency_ms: undefined // hide raw array
    };
  }
};
