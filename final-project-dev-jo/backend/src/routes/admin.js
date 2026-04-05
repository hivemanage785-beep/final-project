import { Router } from 'express';
import { 
  getPendingRequests, 
  approveRequest, 
  rejectRequest 
} from '../controllers/adminController.js';

const router = Router();

// Endpoint 2: GET /api/admin/requests
router.get('/requests', getPendingRequests);

// Endpoint 3: POST /api/admin/requests/:id/approve
router.post('/requests/:id/approve', approveRequest);

// Endpoint 4: POST /api/admin/requests/:id/reject
router.post('/requests/:id/reject', rejectRequest);

export default router;
