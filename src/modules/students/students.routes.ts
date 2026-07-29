import { Router } from 'express';
import { StudentController } from './students.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { requireApprovedEducator } from '../../middleware/educator.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { enrollStudentSchema } from './students.validation.js';

const router = Router();
const controller = new StudentController();

router.use(authenticate, requireRole('educator'), requireApprovedEducator);

router.post('/', validateBody(enrollStudentSchema), controller.enroll);
router.get('/', controller.listMyStudents);
router.get('/:id', controller.getOne);

export { router as studentsRoutes };