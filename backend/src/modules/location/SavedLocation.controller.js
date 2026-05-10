import { savedLocationService } from './SavedLocation.service.js';
import { logger } from '../../common/logger.js';

export async function getSavedLocations(req, res, next) {
  try {
    const uid = req.user.uid || req.user.id;
    const locations = await savedLocationService.getUserLocations(uid);
    
    return res.status(200).json({ success: true, data: locations });
  } catch (error) {
    logger.error(`[SavedLocationController] Get Failed: ${error.message}`);
    next(error);
  }
}

export async function createSavedLocation(req, res, next) {
  try {
    const uid = req.user.uid || req.user.id;
    const mongoUserId = req.user.mongoId || undefined;
    const payload = req.body;

    const result = await savedLocationService.upsertLocation(uid, payload, mongoUserId);

    if (result.note === 'already_exists') {
      return res.status(200).json({ success: true, data: result.location, note: result.note });
    }

    return res.status(201).json({ success: true, data: result.location });
  } catch (error) {
    logger.error(`[SavedLocationController] Create Failed: ${error.message}`);
    next(error);
  }
}

export async function deleteSavedLocation(req, res, next) {
  try {
    const uid = req.user.uid || req.user.id;
    const { id } = req.params;

    const result = await savedLocationService.deleteLocation(uid, id);

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    if (error.message === 'NOT_FOUND_OR_UNAUTHORIZED') {
      return res.status(404).json({ success: false, error: 'Saved location not found or not owned by you' });
    }
    logger.error(`[SavedLocationController] Delete Failed: ${error.message}`);
    next(error);
  }
}
