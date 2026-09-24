import { Router } from 'express';
import { ProgrammeLearningPlanController } from './programme-learning-plan.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { requireApprovedEducator } from '../../middleware/educator.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { createProgrammePlanSchema } from './programme-learning-plan.validation.js';

const controller = new ProgrammeLearningPlanController();

const adminRouter = Router();
adminRouter.use(authenticate, requireRole('admin'));
adminRouter.post('/:studentId/learning-plan', validateBody(createProgrammePlanSchema), controller.createAsAdmin);

const educatorRouter = Router();
educatorRouter.use(authenticate, requireRole('educator'), requireApprovedEducator);
educatorRouter.post('/:studentId/learning-plan', validateBody(createProgrammePlanSchema), controller.createAsEducator);

export { adminRouter as adminProgrammePlanRoutes, educatorRouter as educatorProgrammePlanRoutes };

// Mount in app.ts, on the SAME prefixes as your existing student routers:
//   app.use('/api/admin/students', adminProgrammePlanRoutes);
//   app.use('/api/educators/students', educatorProgrammePlanRoutes);