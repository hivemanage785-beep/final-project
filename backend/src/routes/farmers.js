import { Router } from 'express';
import { Farmer } from '../models/Farmer.js';
import { auth, adminAuth } from '../middleware/auth.js';
import { getNearbyFarmers } from '../controllers/farmerDiscoveryController.js';

const router = Router();

// BEEKEEPER: Find nearby approved farmers
// GET /api/farmers/nearby?lng=x&lat=y&radius=z
router.get('/nearby', auth, getNearbyFarmers);

// ADMIN: Get all farmers
router.get('/all', auth, adminAuth, async (req, res) => {
  try {
    const farmers = await Farmer.find().sort({ createdAt: -1 });
    res.json({ success: true, data: farmers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ADMIN: Add Farmer
router.post('/', auth, adminAuth, async (req, res) => {
  try {
    const { name, phone, crop_type, location, is_public, status } = req.body;
    
    // Additional validation layer for explicitly formatting GeoJSON array
    if (!location?.coordinates?.length === 2) {
      return res.status(400).json({ success: false, error: 'Invalid location format' });
    }

    const farmer = new Farmer({
       name,
       phone,
       crop_type,
       location,
       is_public,
       status
    });
    
    await farmer.save();
    res.status(201).json({ success: true, data: farmer });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ADMIN: Edit Farmer
router.put('/:id', auth, adminAuth, async (req, res) => {
  try {
    const { name, phone, crop_type, location, is_public, status } = req.body;
    const safeData = { name, phone, crop_type, location, is_public, status };
    
    // Remove undefined fields
    Object.keys(safeData).forEach(key => safeData[key] === undefined && delete safeData[key]);

    const farmer = await Farmer.findByIdAndUpdate(
      req.params.id, 
      safeData, 
      { returnDocument: 'after' }
    );
    res.json({ success: true, data: farmer });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ADMIN: Delete Farmer
router.delete('/:id', auth, adminAuth, async (req, res) => {
  try {
    await Farmer.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Farmer deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ADMIN: Approve/Reject Farmer Status
router.patch('/:id/status', auth, adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const farmer = await Farmer.findByIdAndUpdate(
      req.params.id, 
      { status }, 
      { returnDocument: 'after' }
    );
    res.json({ success: true, data: farmer });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Remove old routes if they existed in the old router to keep it clean, but if the frontend relied on them, maybe they break. In this step, we conform to the new architecture constraints.
export default router;
