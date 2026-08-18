import { Router } from 'express';
import { FilesController } from './files.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { presignedUrlSchema } from './files.validation.js';

const router = Router();
const controller = new FilesController();

router.use(authenticate, requireRole('admin'));
router.post('/presigned-upload-url', validateBody(presignedUrlSchema), controller.getPresignedUrl);
import { studentPresignedUrlSchema } from './files.validation.js';

const studentRouter = Router();
studentRouter.use(authenticate, requireRole('student'));
studentRouter.post('/presigned-upload-url', validateBody(studentPresignedUrlSchema), controller.getStudentPresignedUrl);


export { router as filesRoutes, studentRouter as studentFilesRoutes };