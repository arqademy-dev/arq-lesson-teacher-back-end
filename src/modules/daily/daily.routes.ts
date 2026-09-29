import { Router } from 'express';
import { DailyController } from './daily.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { submitInteractionSchema } from './daily.validation.js';

const router = Router();
const controller = new DailyController();

router.use(authenticate, requireRole('student'));

router.get('/sessions/:sessionId', controller.getSessionDetail);
router.get('/current-session', controller.getCurrent);
router.post('/sessions/:sessionId/complete', controller.complete);
router.post('/submissions', validateBody(submitInteractionSchema), controller.submit);
router.get('/sessions/:sessionId/submissions', controller.getSessionSubmissions);

export { router as dailyRoutes };