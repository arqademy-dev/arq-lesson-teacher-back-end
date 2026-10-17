import { Router } from 'express';
import { DailySubmissionController } from './daily-submissions.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { addAdminFileSchema } from './daily-submissions.validation.js';

const controller = new DailySubmissionController();
const router = Router();

router.use(authenticate, requireRole('admin'));

router.get('/:studentId/daily-submissions', controller.adminList);
router.post(
  '/:studentId/daily-submissions/:learningPlanId/:date/admin-files',
  validateBody(addAdminFileSchema),
  controller.addAdminFile
);

export { router as adminDailySubmissionRoutes };