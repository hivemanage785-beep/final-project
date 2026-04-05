import { Router } from 'express';
import { getFarmers, requestPlacement } from '../controllers/farmerController.js';
import { getNearbyFarmers } from '../controllers/farmerDiscoveryController.js';
import { auth } from '../middleware/auth.js';

const router = Router();

router.get('/', getFarmers);
router.post('/request', requestPlacement);

// Farmer Discovery
router.get('/nearby', auth, getNearbyFarmers);

export default router;
