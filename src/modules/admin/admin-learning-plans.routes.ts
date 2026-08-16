import { Router } from 'express';
import { AdminLearningPlansController } from './admin-learning-plans.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { updateLearningPlanSchema, updateScheduledSessionSchema } from '../learning-plans/learning-plans.validation.js';

const router = Router();
const controller = new AdminLearningPlansController();

router.use(authenticate, requireRole('admin'));
router.patch('/:id', validateBody(updateLearningPlanSchema), controller.updatePlan);
router.patch('/sessions/:sessionId', validateBody(updateScheduledSessionSchema), controller.updateSession);

export { router as adminLearningPlansRoutes };