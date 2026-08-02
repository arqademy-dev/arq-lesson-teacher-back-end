import { Router } from 'express';
import { AdminDashboardController } from './admin-dashboard.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';

const router = Router();
const controller = new AdminDashboardController();
router.use(authenticate, requireRole('admin'));
router.get('/summary', controller.getSummary);
export { router as adminDashboardRoutes };