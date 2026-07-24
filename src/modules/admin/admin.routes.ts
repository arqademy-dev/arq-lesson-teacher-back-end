import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
// import { AdminController } from './admin.controller.js';

const router = Router();
// const controller = new AdminController();

router.post('/login', /* controller.login */ (req, res) => res.status(501).json({ message: 'Not implemented yet' }));
router.patch('/educators/:userId/approve', authenticate, /* requireRole('admin'), controller.approveEducator */ (req, res) =>
  res.status(501).json({ message: 'Not implemented yet' })
);

export { router as adminRoutes };