import { Router } from 'express';
import { AdminStudentsController } from './admin-students.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';

const router = Router();
const controller = new AdminStudentsController();

router.use(authenticate, requireRole('admin'));
router.get('/', controller.listAll);
router.get('/:studentId/learning-history', controller.getLearningHistory);
router.get('/:studentId/full-profile', controller.getFullProfile);

export { router as adminStudentsRoutes };