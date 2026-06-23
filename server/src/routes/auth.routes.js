import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { RegisterSchema, LoginSchema } from '../models/schemas.js';

const router = Router();
router.post('/register', validate(RegisterSchema), authController.register);
router.post('/login', validate(LoginSchema), authController.login);
router.get('/profile', authenticate, authController.profile);

export default router;
