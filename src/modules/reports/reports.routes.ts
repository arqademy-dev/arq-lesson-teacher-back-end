import { Router } from 'express';
import { ReportsController } from './reports.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { requireApprovedEducator } from '../../middleware/educator.middleware.js';

const controller = new ReportsController();

const adminReportRoutes = Router();
adminReportRoutes.use(authenticate, requireRole('admin'));
adminReportRoutes.get('/:studentId/report', controller.adminGetReport);

const educatorReportRoutes = Router();
educatorReportRoutes.use(authenticate, requireRole('educator'), requireApprovedEducator);
educatorReportRoutes.get('/:studentId/report', controller.educatorGetReport);

const studentReportRoutes = Router();
studentReportRoutes.use(authenticate, requireRole('student'));
studentReportRoutes.get('/report', controller.studentGetOwnReport);

export { adminReportRoutes, educatorReportRoutes, studentReportRoutes };