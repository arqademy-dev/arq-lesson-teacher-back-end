import { Router } from 'express';
import { StudentAuthController } from './students-auth.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { studentLoginSchema } from './students-auth.validation.js';
import { StudentPasswordController } from './students-password.controller.js';
import { forgotPasswordSchema, resetPasswordSchema, otpConfirmSchema } from './students-auth.validation.js';

const router = Router();
const controller = new StudentAuthController();
const password = new StudentPasswordController();

router.post('/me/password-otp', authenticate, requireRole('student'), password.sendOtp);
router.post('/me/password-otp/confirm', authenticate, requireRole('student'), validateBody(otpConfirmSchema), password.confirmOtp);

router.post('/login', validateBody(studentLoginSchema), controller.login);
router.get('/me', authenticate, requireRole('student'), controller.me);

router.post('/forgot-password', validateBody(forgotPasswordSchema), password.forgot);
router.get('/reset-password/verify', password.verify);
router.post('/reset-password', validateBody(resetPasswordSchema), password.reset);

export { router as studentAuthRoutes };