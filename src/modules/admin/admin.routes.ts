import { Router } from 'express';
import { AdminController } from './admin.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { adminLoginSchema, approvalActionSchema } from './admin.validation.js';

const router = Router();
const controller = new AdminController();

router.post('/login', validateBody(adminLoginSchema), controller.login);

router.get('/educators/pending', authenticate, requireRole('admin'), controller.listPendingEducators);
router.get('/educators', authenticate, requireRole('admin'), controller.listAllEducators);
router.patch(
  '/educators/:educatorId/approval',
  authenticate,
  requireRole('admin'),
  validateBody(approvalActionSchema),
  controller.updateEducatorApproval
);

export { router as adminRoutes };