import { Router } from 'express';
import { getHives, createHive, updateHive, deleteHive } from '../controllers/hiveController.js';
import { validate } from '../middleware/validate.js';
import { createHiveSchema, updateHiveSchema } from '../schemas/index.js';

const router = Router();

router.get('/', getHives);
router.post('/', validate(createHiveSchema), createHive);
router.put('/:id', validate(updateHiveSchema), updateHive);
router.delete('/:id', deleteHive);

export default router;
