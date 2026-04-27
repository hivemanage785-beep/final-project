import { Request } from '../models/Request.js';
import { logger } from '../utils/logger.js';

const formatDoc = (doc) => {
  const obj = doc.toObject ? doc.toObject() : doc;
  obj.id = obj._id ? obj._id.toString() : obj.id;
  delete obj._id;
  delete obj.__v;
  return obj;
};

export async function getRequests(req, res, next) {
  try {
    const filter = req.user.role === 'admin' ? {} : { beekeeperId: req.user.uid };
    const snapshot = await Request.find(filter).sort({ createdAt: -1 });
    const requests = snapshot.map(formatDoc);
    res.status(200).json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
}

export async function updateRequest(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status value' });
    }

    const updated = await Request.findByIdAndUpdate(id, { status }, { returnDocument: 'after' });

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Request not found' });
    }

    logger.info(`Request ${id} updated to ${status} by ${req.user.email || req.user.uid}`);
    res.status(200).json({ success: true, data: formatDoc(updated) });
  } catch (error) {
    next(error);
  }
}
