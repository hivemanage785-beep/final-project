import { Router } from 'express';
import { register, login } from '../controllers/authController.js';
import { validate } from '../middleware/validate.js';
import { authSchema, loginSchema } from '../schemas/index.js';

const router = Router();

router.post('/register', validate(authSchema), register);
router.post('/login', validate(loginSchema), login);

export default router;
