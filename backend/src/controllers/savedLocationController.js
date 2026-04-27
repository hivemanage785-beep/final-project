import { SavedLocation } from '../models/SavedLocation.js';

const formatDoc = (doc) => {
  const obj = doc.toObject ? doc.toObject() : doc;
  obj.id = obj._id ? obj._id.toString() : obj.id;
  delete obj._id;
  delete obj.__v;
  return obj;
};

export async function getSavedLocations(req, res, next) {
  try {
    const uid = req.user.uid || req.user.id;
    const docs = await SavedLocation.find({ uid }).sort({ created_at: -1 });
    res.status(200).json({ success: true, data: docs.map(formatDoc) });
  } catch (error) {
    next(error);
  }
}

export async function createSavedLocation(req, res, next) {
  try {
    const uid = req.user.uid || req.user.id;
    const { id, lat, lng, score, month, syncVersion, created_at } = req.body;

    if (!id || lat == null || lng == null || score == null || !month) {
      return res.status(400).json({ success: false, error: 'Missing required fields: id, lat, lng, score, month' });
    }

    // Idempotent upsert — replay-safe
    const existing = await SavedLocation.findById(id).catch(() => null);
    if (existing) {
      return res.status(200).json({ success: true, data: formatDoc(existing), note: 'already_exists' });
    }

    const doc = await SavedLocation.create({
      _id: id,
      uid,
      user_id: req.user.mongoId || undefined,
      lat,
      lng,
      score,
      month,
      syncVersion: syncVersion || 1,
      created_at: created_at ? new Date(created_at) : new Date(),
    });

    res.status(201).json({ success: true, data: formatDoc(doc) });
  } catch (error) {
    next(error);
  }
}

export async function deleteSavedLocation(req, res, next) {
  try {
    const uid = req.user.uid || req.user.id;
    const { id } = req.params;

    const deleted = await SavedLocation.findOneAndDelete({ _id: id, uid });
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Saved location not found or not owned by you' });
    }

    res.status(200).json({ success: true, data: { id } });
  } catch (error) {
    next(error);
  }
}
