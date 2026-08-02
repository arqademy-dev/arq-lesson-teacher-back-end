// educator-dashboard.routes.ts
import { Router } from 'express';
import { EducatorDashboardController } from './educator-dashboard.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { requireApprovedEducator } from '../../middleware/educator.middleware.js';

const router = Router();
const controller = new EducatorDashboardController();
router.use(authenticate, requireRole('educator'), requireApprovedEducator);
router.get('/summary', controller.getSummary);
export { router as educatorDashboardRoutes };