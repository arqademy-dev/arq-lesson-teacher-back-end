import { Router } from 'express';
import { FileHistoryController } from './file-history.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { requireApprovedEducator } from '../../middleware/educator.middleware.js';

const controller = new FileHistoryController();

const studentFileHistoryRoutes = Router();
studentFileHistoryRoutes.use(authenticate, requireRole('student'));
studentFileHistoryRoutes.get('/', controller.studentGetOwn);

const educatorFileHistoryRoutes = Router();
educatorFileHistoryRoutes.use(authenticate, requireRole('educator'), requireApprovedEducator);
educatorFileHistoryRoutes.get('/:studentId/files', controller.educatorGetForStudent);

const adminFileHistoryRoutes = Router();
adminFileHistoryRoutes.use(authenticate, requireRole('admin'));
adminFileHistoryRoutes.get('/:studentId/files', controller.adminGetForStudent);

export { studentFileHistoryRoutes, educatorFileHistoryRoutes, adminFileHistoryRoutes };