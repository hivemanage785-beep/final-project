import { Farmer } from '../models/Farmer.js';
import { ContactRequest } from '../models/ContactRequest.js';

export async function getNearbyFarmers(req, res, next) {
  try {
    let { lng, lat, radius = 50000 } = req.query; 
    
    if (lng === undefined || lat === undefined) {
      return res.status(400).json({ success: false, error: 'Missing coordinates' });
    }

    const parsedLng = parseFloat(lng);
    const parsedLat = parseFloat(lat);

    if (isNaN(parsedLng) || isNaN(parsedLat) || parsedLng < -180 || parsedLng > 180 || parsedLat < -90 || parsedLat > 90) {
      return res.status(400).json({ success: false, error: 'Invalid coordinates' });
    }

    // Hard-cap the scraping radius to a maximum of 100km (100000m)
    const maxRadius = Math.min(parseInt(radius) || 50000, 100000);

    const farmers = await Farmer.find({
      status: 'approved',
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parsedLng, parsedLat] },
          $maxDistance: maxRadius
        }
      }
    });

    const mappedFarmers = farmers.map(f => {
      const doc = f.toObject();
      return {
        ...doc,
        approx_location: {
          lat: doc.location.coordinates[1],
          lng: doc.location.coordinates[0]
        }
      };
    });

    res.status(200).json({ success: true, data: mappedFarmers });
  } catch (error) {
    console.error("GeoQuery Error: ", error);
    next(error);
  }
}

export async function createContactRequest(req, res) { 
  try {
     if (!req.user.isVerified) {
       return res.status(403).json({ success: false, error: 'You must be verified by an admin to request farmer contact details.' });
     }
     
     const { farmer_id } = req.body;
     const newReq = await ContactRequest.create({ farmer_id, user_id: req.user.uid, status: 'pending' });
     res.status(201).json({ success: true, data: newReq });
  } catch (err) {
     res.status(500).json({ success: false, error: err.message });
  }
}

export async function approveContactRequest(req, res) { 
  try {
     const { request_id } = req.body;
     const updated = await ContactRequest.findByIdAndUpdate(request_id, { status: 'approved' }, { new: true });
     res.status(200).json({ success: true, data: updated });
  } catch (err) {
     res.status(500).json({ success: false, error: err.message });
  }
}

export async function getContactDetails(req, res) { 
  try {
     const request = await ContactRequest.findById(req.params.request_id);
     if (!request || request.status !== 'approved' || request.user_id !== req.user.uid) {
         return res.status(403).json({ success: false, error: 'Unauthorized or pending' });
     }
     const farmer = await Farmer.findById(request.farmer_id);
     res.status(200).json({ success: true, data: { phone: farmer.phone } });
  } catch (err) {
     res.status(500).json({ success: false, error: err.message });
  }
}
