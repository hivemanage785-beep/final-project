import express from 'express';
import { getRequests, updateRequest } from '../../modules/request/requests.controller.js';
import { admin } from '../../middlewares/auth.js';

const router = express.Router();

router.get('/', getRequests);
router.patch('/:id', admin, updateRequest); // Admin only: approve/reject

export default router;
