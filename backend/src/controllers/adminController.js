import { ContactRequest } from '../models/ContactRequest.js';
import { Farmer } from '../models/Farmer.js';

/**
 * ── CONTACT REQUESTS ──────────────────────────────────────────────────────────
 */

export async function getPendingRequests(req, res, next) {
  try {
    const { status = 'pending' } = req.query;
    const requests = await ContactRequest.find({ status })
      .sort({ created_at: -1 })
      .limit(100);

    res.status(200).json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
}

export async function approveRequest(req, res, next) {
  try {
    const { id } = req.params; 
    const admin_id = req.user.id;

    const request = await ContactRequest.findOneAndUpdate(
      { request_id: id },
      { 
        status: 'approved', 
        approved_by: admin_id,
        approved_at: new Date()
      },
      { returnDocument: 'after' }
    );

    if (!request) {
      return res.status(404).json({ success: false, error: 'Request not found' });
    }

    res.status(200).json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
}

/**
 * ── FARMER MANAGEMENT ─────────────────────────────────────────────────────────
 */

export async function getAllFarmers(req, res, next) {
  try {
    const farmers = await Farmer.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: farmers });
  } catch (error) {
    next(error);
  }
}

export async function updateFarmerStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['approved', 'pending', 'rejected'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const farmer = await Farmer.findByIdAndUpdate(id, { status }, { returnDocument: 'after' });
    if (!farmer) return res.status(404).json({ success: false, error: 'Farmer not found' });

    res.status(200).json({ success: true, data: farmer });
  } catch (error) {
    next(error);
  }
}

export async function deleteFarmer(req, res, next) {
  try {
    const { id } = req.params;
    const deleted = await Farmer.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Farmer not found' });
    
    res.status(200).json({ success: true, message: 'Farmer deleted' });
  } catch (error) {
    next(error);
  }
}

/**
 * ── BEEKEEPER VERIFICATION ───────────────────────────────────────────────────
 */

export async function getAllBeekeepers(req, res, next) {
  try {
    const { User } = await import('../models/User.js');
    const beekeepers = await User.find({ role: 'beekeeper' }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: beekeepers });
  } catch (error) {
    next(error);
  }
}

export async function verifyBeekeeper(req, res, next) {
  try {
    const { id } = req.params;
    const { isVerified } = req.body;
    const { User } = await import('../models/User.js');
    
    const beekeeper = await User.findByIdAndUpdate(
      id, 
      { isVerified }, 
      { returnDocument: 'after' }
    );
    
    if (!beekeeper) return res.status(404).json({ success: false, error: 'Beekeeper not found' });
    
    res.status(200).json({ success: true, data: beekeeper });
  } catch (error) {
    next(error);
  }
}
