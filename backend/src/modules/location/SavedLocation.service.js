import { SavedLocation } from './savedLocation.model.js';

export class SavedLocationService {
  /**
   * Fetch all saved locations for a user.
   * @param {string} uid - User's Firebase UID
   */
  async getUserLocations(uid) {
    const docs = await SavedLocation.find({ uid }).sort({ createdAt: -1 });
    
    // Map back to the flat structure the frontend expects (lat, lng instead of location.coordinates)
    return docs.map(doc => {
      const obj = doc.toObject();
      return {
        id: obj._id,
        uid: obj.uid,
        lat: obj.location?.coordinates[1] || 0,
        lng: obj.location?.coordinates[0] || 0,
        score: obj.score,
        month: obj.month,
        syncVersion: obj.syncVersion,
        created_at: obj.createdAt
      };
    });
  }

  /**
   * Create or update a saved location (Idempotent).
   * @param {string} uid - User's Firebase UID
   * @param {Object} payload - Validated input data
   */
  async upsertLocation(uid, payload, mongoUserId) {
    // Check if it already exists
    const existing = await SavedLocation.findById(payload.id).catch(() => null);
    if (existing) {
      return { location: existing, note: 'already_exists' };
    }

    const doc = await SavedLocation.create({
      _id: payload.id,
      uid,
      userId: mongoUserId,
      location: { type: 'Point', coordinates: [payload.lng, payload.lat] },
      score: payload.score,
      month: payload.month,
      syncVersion: payload.syncVersion || 1,
      createdAt: payload.created_at ? new Date(payload.created_at) : new Date(),
    });

    const obj = doc.toObject();
    return {
      location: {
        id: obj._id,
        uid: obj.uid,
        lat: obj.location.coordinates[1],
        lng: obj.location.coordinates[0],
        score: obj.score,
        month: obj.month,
        syncVersion: obj.syncVersion,
        created_at: obj.createdAt
      }
    };
  }

  /**
   * Delete a saved location.
   * @param {string} uid - User's Firebase UID
   * @param {string} locationId - ID of the location to delete
   */
  async deleteLocation(uid, locationId) {
    const deleted = await SavedLocation.findOneAndDelete({ _id: locationId, uid });
    if (!deleted) {
      throw new Error('NOT_FOUND_OR_UNAUTHORIZED');
    }
    return { id: locationId };
  }
}

export const savedLocationService = new SavedLocationService();
