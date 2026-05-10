import { logger } from '../../common/logger.js';
import { harvestService } from './harvest.service.js';

export async function createHarvest(req, res, next) {
  try {
    const data = await harvestService.createHarvest(req.body, req.user);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getHarvestTrace(req, res, next) {
  try {
    const lookupId = req.params.batch_id || req.params.id;
    const safeData = await harvestService.getHarvestTrace(lookupId);

    if (!safeData) {
      return res.status(404).json({ success: false, error: 'Batch not found' });
    }
    res.status(200).json({ success: true, data: safeData });
  } catch (error) {
    next(error);
  }
}

export async function getMyHarvests(req, res, next) {
  try {
    const batches = await harvestService.getMyHarvests(req.user.id);
    res.status(200).json({ success: true, data: batches });
  } catch (error) {
    next(error);
  }
}

export async function verifyBatch(req, res, next) {
  try {
    const { publicId, status, certification_id } = req.body;

    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status. Use: verified | rejected' });
    }

    const result = await harvestService.verifyBatch(publicId, status, certification_id, req.user.id);
    if (!result) {
      return res.status(404).json({ success: false, error: 'Batch not found' });
    }

    logger.info(`[Batch] ${publicId} marked ${status} by admin ${req.user.id}`);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    if (error.message === 'BATCH_LOCKED') {
      return res.status(403).json({ success: false, error: 'BATCH_LOCKED', message: 'This batch is locked and cannot be modified.' });
    }
    next(error);
  }
}
