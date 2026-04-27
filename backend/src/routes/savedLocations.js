import { Router } from 'express';
import {
  getSavedLocations,
  createSavedLocation,
  deleteSavedLocation,
} from '../controllers/savedLocationController.js';

const router = Router();

router.get('/', getSavedLocations);
router.post('/', createSavedLocation);
router.delete('/:id', deleteSavedLocation);

export default router;
