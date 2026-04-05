import { Farmer } from '../models/Farmer.js';
import { ContactRequest } from '../models/ContactRequest.js';

export async function getNearbyFarmers(req, res, next) {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'Latitude and longitude are required' });
    }

    const radiusInKm = 5.0; // Search within immediate 5km radius
    
    // Simple spatial filter (not using $near to avoid index requirements for this task, using simple range)
    const latDelta = radiusInKm / 111.32; 
    const lngDelta = radiusInKm / (111.32 * Math.cos(parseFloat(lat) * Math.PI / 180));

    const farmers = await Farmer.find({
      is_public: true,
      lat: { $gte: parseFloat(lat) - latDelta, $lte: parseFloat(lat) + latDelta },
      lng: { $gte: parseFloat(lng) - lngDelta, $lte: parseFloat(lng) + lngDelta }
    }).limit(20);

    const publicFarmers = farmers.map(f => ({
      farmer_id: f.farmer_id,
      name: f.name,
      // Rule 1:approx_location (rounded to ~2km precision to protect exact property location)
      approx_location: {
        lat: Math.round(f.lat * 50) / 50,
        lng: Math.round(f.lng * 50) / 50
      }
    }));

    res.status(200).json({ success: true, data: publicFarmers });
  } catch (error) {
    next(error);
  }
}

export async function createContactRequest(req, res, next) {
  try {
    const { farmer_id } = req.body;
    const requester_id = req.user.id; // From auth middleware

    const farmer = await Farmer.findOne({ farmer_id });
    if (!farmer) {
      return res.status(404).json({ success: false, message: 'Farmer not found' });
    }

    // Check for existing request
    const existing = await ContactRequest.findOne({ requester_id, farmer_id });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Request already exists', request_id: existing.request_id });
    }

    const newRequest = await ContactRequest.create({
      requester_id,
      farmer_id,
      status: 'pending'
    });

    res.status(201).json({ success: true, data: { request_id: newRequest.request_id, status: newRequest.status } });
  } catch (error) {
    next(error);
  }
}

export async function approveContactRequest(req, res, next) {
  try {
    // ADMIN ONLY check
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { request_id } = req.body;
    const request = await ContactRequest.findOneAndUpdate(
      { request_id },
      { status: 'approved' },
      { new: true }
    );

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    res.status(200).json({ success: true, message: 'Request approved', data: request });
  } catch (error) {
    next(error);
  }
}

export async function getContactDetails(req, res, next) {
  try {
    const { request_id } = req.params;
    const requester_id = req.user.id;

    const request = await ContactRequest.findOne({ request_id });
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Security: Only the requester can view their request's outcome
    if (request.requester_id.toString() !== requester_id.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    if (request.status !== 'approved') {
      return res.status(403).json({ success: false, message: 'Contact access not yet approved or was rejected', status: request.status });
    }

    const farmer = await Farmer.findOne({ farmer_id: request.farmer_id });
    if (!farmer) {
       return res.status(404).json({ success: false, message: 'Farmer no longer available' });
    }

    res.status(200).json({ 
      success: true, 
      data: {
        farmer_name: farmer.name,
        phone: farmer.phone
      } 
    });
  } catch (error) {
    next(error);
  }
}
