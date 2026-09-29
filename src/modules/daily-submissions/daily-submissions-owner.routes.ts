import { Router } from 'express';
import { DailySubmissionOwnerController } from './daily-submissions-owner.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { requireApprovedEducator } from '../../middleware/educator.middleware.js';

const controller = new DailySubmissionOwnerController();

const educatorRouter = Router();
educatorRouter.use(authenticate, requireRole('educator'), requireApprovedEducator);
educatorRouter.get('/:studentId/daily-submissions', controller.listAsEducator);
educatorRouter.post('/:studentId/daily-submissions/:submissionId/reopen', controller.reopenAsEducator);

const adminRouter = Router();
adminRouter.use(authenticate, requireRole('admin'));
adminRouter.get('/:studentId/daily-submissions', controller.listAsAdmin);
adminRouter.post('/:studentId/daily-submissions/:submissionId/reopen', controller.reopenAsAdmin);

export { educatorRouter as educatorDailySubmissionRoutes, adminRouter as adminDailySubmissionRoutes };

// Mount in app.ts — SAME prefixes as your existing student routers, so these
// routes sit alongside GET /:id etc. without conflicting (different suffixes):
//   app.use('/api/educators/students', educatorDailySubmissionRoutes);
//   app.use('/api/admin/students', adminDailySubmissionRoutes);