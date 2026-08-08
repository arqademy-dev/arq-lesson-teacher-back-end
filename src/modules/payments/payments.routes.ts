import { Router } from 'express';
import { PaymentController } from './payments.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { initiatePaymentSchema } from './payments.validation.js';

const studentRouter = Router();
const adminRouter = Router();
const controller = new PaymentController();

studentRouter.use(authenticate, requireRole('student'));
studentRouter.get('/', controller.myPayments);
studentRouter.post('/initiate', validateBody(initiatePaymentSchema), controller.initiate);
studentRouter.get('/me', controller.myPayments);

adminRouter.use(authenticate, requireRole('admin'));
adminRouter.get('/pending', controller.listPending);
adminRouter.get('/', controller.listAll);
adminRouter.patch('/:id/approve', controller.approve);
adminRouter.patch('/:id/reject', controller.reject);

export { studentRouter as studentPaymentRoutes, adminRouter as adminPaymentRoutes };