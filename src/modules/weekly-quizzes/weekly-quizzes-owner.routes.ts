import { Router } from 'express';
import { WeeklyQuizzesOwnerController } from './weekly-quizzes-owner.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { requireApprovedEducator } from '../../middleware/educator.middleware.js';

const controller = new WeeklyQuizzesOwnerController();

const adminRouter = Router();
adminRouter.use(authenticate, requireRole('admin'));
adminRouter.get('/learning-plans/:learningPlanId/weekly-quizzes', controller.listAsAdmin);
adminRouter.get('/weekly-quizzes/:weeklyQuizId', controller.getDetailAsAdmin);

const educatorRouter = Router();
educatorRouter.use(authenticate, requireRole('educator'), requireApprovedEducator);
// Note: the owner controller only has listAsEducator today — no per-quiz detail
// for educators yet. Add a getDetailAsEducator (reusing planBelongsToEducator)
// if that's needed later.
educatorRouter.get('/learning-plans/:learningPlanId/weekly-quizzes', controller.listAsEducator);

export { adminRouter as adminWeeklyQuizRoutes, educatorRouter as educatorWeeklyQuizRoutes };

// Mount in app.ts:
//   app.use('/api/admin', adminWeeklyQuizRoutes);
//   app.use('/api/educators', educatorWeeklyQuizRoutes);