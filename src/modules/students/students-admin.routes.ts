import { Router } from 'express';
import { AdminStudentsController } from './students-admin.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { adminEnrollStudentSchema, updateStudentSchema } from './students.validation.js';

const router = Router();
const controller = new AdminStudentsController();

router.use(authenticate, requireRole('admin'));

router.post('/', validateBody(adminEnrollStudentSchema), controller.enroll);
router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.patch('/:id', validateBody(updateStudentSchema), controller.update);
router.delete('/:id', controller.deactivate);

export { router as adminStudentEnrollmentRoutes };

// Mount it next to your other admin routers, e.g.:
//   app.use('/api/admin/students', adminStudentEnrollmentRoutes);