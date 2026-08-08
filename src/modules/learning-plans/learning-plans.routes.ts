import { Router } from 'express';
import { LearningPlanController } from './learning-plans.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { requireApprovedEducator } from '../../middleware/educator.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { createLearningPlanSchema } from './learning-plans.validation.js';

const router = Router();
const controller = new LearningPlanController();

router.use(authenticate, requireRole('educator'), requireApprovedEducator);

router.post('/', validateBody(createLearningPlanSchema), controller.create);
router.get('/:id', controller.getOne);
router.get('/student/:studentId', controller.listForStudent);
router.get('/student/:studentId/breakdown', controller.getStudentPlanBreakdown);


export { router as learningPlanRoutes };