// student-dashboard.routes.ts
import { Router } from 'express';
import { StudentDashboardController } from './student-dashboard.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';

const router = Router();
const controller = new StudentDashboardController();
router.use(authenticate, requireRole('student'));
router.get('/', controller.getSummary);
export { router as studentDashboardRoutes };