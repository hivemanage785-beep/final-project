import express from 'express';
import { getRequests, updateRequest } from '../controllers/requestsController.js';
import { admin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getRequests);
router.patch('/:id', admin, updateRequest); // Admin only: approve/reject

export default router;
