import express from 'express';
import { getInspections, createInspection } from '../controllers/inspectionController.js';
import { validate } from '../middleware/validate.js';
import { createInspectionSchema } from '../schemas/index.js';

const router = express.Router();

router.get('/', getInspections);
router.post('/', validate(createInspectionSchema), createInspection);

export default router;
