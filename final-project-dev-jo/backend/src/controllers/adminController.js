import { ContactRequest } from '../models/ContactRequest.js';

export async function getPendingRequests(req, res, next) {
  try {
    const { status = 'pending' } = req.query;
    const requests = await ContactRequest.find({ status })
      .sort({ created_at: -1 })
      .limit(100);

    const data = requests.map(r => ({
      request_id: r.request_id,
      requester_id: r.requester_id,
      farmer_id: r.farmer_id,
      status: r.status,
      created_at: r.created_at
    }));

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function approveRequest(req, res, next) {
  try {
    const { id } = req.params; // this is request_id UUID
    const admin_id = req.user.id;

    const request = await ContactRequest.findOneAndUpdate(
      { request_id: id },
      { 
        status: 'approved', 
        approved_by: admin_id,
        approved_at: new Date()
      },
      { new: true }
    );

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    res.status(200).json({ success: true, message: 'Request approved successfully', data: request });
  } catch (error) {
    next(error);
  }
}

export async function rejectRequest(req, res, next) {
  try {
    const { id } = req.params; // this is request_id UUID
    
    const request = await ContactRequest.findOneAndUpdate(
      { request_id: id },
      { status: 'rejected' },
      { new: true }
    );

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    res.status(200).json({ success: true, message: 'Request rejected successfully', data: request });
  } catch (error) {
    next(error);
  }
}
