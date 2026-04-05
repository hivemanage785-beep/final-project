import { Farmer } from '../models/Farmer.js';
import { Request } from '../models/Request.js';

const formatDoc = (doc) => {
  const obj = doc.toObject ? doc.toObject() : doc;
  obj.id = obj._id ? obj._id.toString() : obj.id;
  delete obj._id;
  delete obj.__v;
  return obj;
};

// Simple distance formula (Haversine approximation)
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
            Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return R * c; // Distance in km
}

export async function getFarmers(req, res, next) {
  try {
    const { lat, lng } = req.query;
    
    let allFarmers = await Farmer.find({});

    let results = allFarmers.map(formatDoc);

    if (lat && lng) {
       const userLat = parseFloat(lat);
       const userLng = parseFloat(lng);
       results.forEach(f => {
          f.distance = getDistance(userLat, userLng, f.lat, f.lng);
       });
       results.sort((a, b) => a.distance - b.distance);
       // Return top 10 nearby
       results = results.slice(0, 10);
    }

    res.status(200).json({ success: true, data: results });
  } catch(error) {
    next(error);
  }
}

export async function requestPlacement(req, res, next) {
  try {
    const payload = req.body;
    
    const newRequest = await Request.create({
       ...payload,
       beekeeperId: req.user.id,
       status: 'pending'
    });
    
    res.status(201).json({ success: true, data: formatDoc(newRequest) });
  } catch(error) {
    next(error);
  }
}

