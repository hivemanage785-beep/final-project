import { Router } from 'express';
import { 
  getPendingRequests, 
  approveRequest, 
  getAllFarmers,
  updateFarmerStatus,
  deleteFarmer,
  getAllBeekeepers,
  verifyBeekeeper
} from '../controllers/adminController.js';

const router = Router();

/**
 * ── CONTACT REQUESTS ──────────────────────────────────────────────────────────
 */
router.get('/requests', getPendingRequests);
router.post('/requests/:id/approve', approveRequest);

/**
 * ── FARMER MANAGEMENT ─────────────────────────────────────────────────────────
 */
router.get('/farmers', getAllFarmers);
router.patch('/farmers/:id/status', updateFarmerStatus);
router.delete('/farmers/:id', deleteFarmer);

/**
 * ── BEEKEEPER MANAGEMENT ──────────────────────────────────────────────────────
 */
router.get('/beekeepers', getAllBeekeepers);
router.patch('/beekeepers/:id/verify', verifyBeekeeper);

export default router;
