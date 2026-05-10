import express from 'express';
import { getTile } from '../../modules/tile/tile.controller.js';

const router = express.Router();

router.get('/tile/:z/:x/:y', getTile);

export default router;
