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
    if (global.IS_MOCKED_DB) {
      return res.status(200).json({
        success: true,
        data: [
          { id: 'req-1', farmerId: 'farmer-001', type: 'farmer_access', name: 'Ramesh Singh', status: 'pending', requested_at: new Date().toISOString() },
          { id: 'req-2', farmerId: 'farmer-002', type: 'certificate', name: 'Alpha Apiaries', status: 'pending', requested_at: new Date().toISOString() }
        ]
      });
    }
    // Admins see all requests; regular users see only their own
    const filter = req.user.role === 'admin' ? {} : { beekeeperId: req.user.id };
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

    if (global.IS_MOCKED_DB) {
      logger.info(`[MOCK] Request ${id} updated to ${status}`);
      return res.status(200).json({ success: true, data: { id, status } });
    }

    const updated = await Request.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Request not found' });
    }

    logger.info(`Request ${id} updated to ${status} by ${req.user.email}`);
    res.status(200).json({ success: true, data: formatDoc(updated) });
  } catch (error) {
    next(error);
  }
}


