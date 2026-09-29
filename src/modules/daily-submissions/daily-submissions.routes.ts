import { Router } from 'express';
import { DailySubmissionController } from './daily-submissions.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { saveNoteSchema, addFilesSchema } from './daily-submissions.validation.js';

const controller = new DailySubmissionController();
const router = Router();

router.use(authenticate, requireRole('student'));

router.get('/', controller.list);
router.get('/:learningPlanId/:date', controller.getDay);
router.put('/:learningPlanId/:date', validateBody(saveNoteSchema), controller.saveNote);
router.post('/:learningPlanId/:date/files', validateBody(addFilesSchema), controller.addFiles);
router.delete('/:learningPlanId/:date/files/:fileId', controller.removeFile);
router.post('/:learningPlanId/:date/submit', controller.submit);

export { router as studentDailySubmissionRoutes };

// Mount in app.ts:
//   app.use('/api/students/me/daily-submissions', studentDailySubmissionRoutes);