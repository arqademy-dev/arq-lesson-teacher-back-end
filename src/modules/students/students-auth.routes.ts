import { Router } from 'express';
import { StudentAuthController } from './students-auth.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { studentLoginSchema } from './students-auth.validation.js';

const router = Router();
const controller = new StudentAuthController();

router.post('/login', validateBody(studentLoginSchema), controller.login);
router.get('/me', authenticate, requireRole('student'), controller.me);

export { router as studentAuthRoutes };