import { Router } from 'express';
import { AssessmentsController } from './assessments.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { requireApprovedEducator } from '../../middleware/educator.middleware.js';

const controller = new AssessmentsController();

const adminAssessmentsRoutes = Router();
adminAssessmentsRoutes.use(authenticate, requireRole('admin'));
adminAssessmentsRoutes.get('/', controller.adminGetAll);

const educatorAssessmentsRoutes = Router();
educatorAssessmentsRoutes.use(authenticate, requireRole('educator'), requireApprovedEducator);
educatorAssessmentsRoutes.get('/:studentId/assessments', controller.educatorGetForStudent);

export { adminAssessmentsRoutes, educatorAssessmentsRoutes };