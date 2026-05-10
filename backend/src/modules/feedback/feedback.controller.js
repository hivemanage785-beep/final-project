import { InteractionLog } from '../interaction/interactionLog.model.js';
import { sendMLFeedback } from '../../infrastructure/mlService.js';
import { logger } from '../../common/logger.js';
import fs from 'fs';
import path from 'path';

export async function feedbackController(req, res, next) {
  try {
    const data = req.body; 
    
    // Normalize derived success parameter if missing
    let success = data.success !== undefined ? data.success : (data.finalScore && data.finalScore > 35 ? 1 : 0);

    // Persist feedback to MongoDB asynchronously
    InteractionLog.create({
      ...data,
      success,
      timestamp: new Date()
    }).catch(err => {
      logger.error(`InteractionLog write failed: ${err.message}`);
      // Fallback CSV to local if DB fails
      fallbackCSV(data, success);
    });

    const mlPayload = {
      lat: data.lat || 0,
      lng: data.lng || 0,
      month: data.month || new Date().getMonth() + 1,
      temp: data.avgTemp || 28.0,
      humidity: data.humidity || 65.0, 
      rainfall: data.avgRain || 0,
      ndvi: data.ndvi || 0.6,
      flora: data.floraCount || 5,
      success
    };

    // Broadcast mapped telemetry data to FastAPI learning loop
    sendMLFeedback(mlPayload).catch(e => logger.warn('Failed to dispatch ML feedback loop'));

    res.status(201).json({ success: true, data: { message: 'Feedback accepted' } });
  } catch (error) {
    logger.error(`Feedback Controller Failure: ${error.message}`);
    res.status(500).json({ success: false, error: 'Feedback processing degraded' });
  }
}

function fallbackCSV(data, success) {
  try {
    const fallbackPath = path.join(process.cwd(), 'fallback_feedback.csv');
    const header = !fs.existsSync(fallbackPath);
    const row = `${data.lat},${data.lng},${data.month},${success},${new Date().toISOString()}\n`;
    if (header) fs.appendFileSync(fallbackPath, 'lat,lng,month,success,timestamp\n');
    fs.appendFileSync(fallbackPath, row);
  } catch (e) {
    logger.error('CRITICAL: Fallback storage failed', e.message);
  }
}
