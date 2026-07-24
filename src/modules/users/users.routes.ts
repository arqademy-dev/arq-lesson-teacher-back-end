import { Router } from 'express';
import { UserController } from './users.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { registerUserBodySchema, loginUserBodySchema } from './users.validation.js';

const router = Router();
const controller = new UserController();

router.post('/register', validateBody(registerUserBodySchema), controller.register);
router.post('/login', validateBody(loginUserBodySchema), controller.login);
router.post('/logout', controller.logout);
router.get('/me', authenticate, controller.getMe);

export { router as userRoutes };