import { Router } from 'express';
import { processSyncQueue } from '../controllers/syncController.js';

const router = Router();

router.post('/', processSyncQueue);

export default router;
