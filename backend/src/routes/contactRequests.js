import { Router } from 'express';
import { 
  createContactRequest, 
  approveContactRequest, 
  getContactDetails 
} from '../controllers/farmerDiscoveryController.js';
import { auth, admin } from '../middleware/auth.js';

const router = Router();

// Endpoint 2: Request Contact Access
router.post('/', auth, createContactRequest);

// Endpoint 3: Approve Request (Admin)
router.post('/approve', auth, admin, approveContactRequest);

// Endpoint 4: Get Final Details (if approved)
// Handled by registration in index.js to support /api/contact/{request_id}
export const contactRouter = Router();
contactRouter.get('/:request_id', auth, getContactDetails);

export default router;
