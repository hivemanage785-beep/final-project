import express from 'express';
import { getTile } from '../controllers/tileController.js';

const router = express.Router();

router.get('/tile/:z/:x/:y', getTile);

export default router;
