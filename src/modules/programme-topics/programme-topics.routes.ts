import { Router } from 'express';
import { ProgrammeTopicsController } from './programme-topics.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { addProgrammeTopicSchema, reorderTopicsSchema } from './programme-topics.validation.js';

const router = Router();
const controller = new ProgrammeTopicsController();

router.use(authenticate, requireRole('admin'));

// Specific paths first, then the parameterised one.
router.get('/:programmeId/topics/available', controller.available);
router.put('/:programmeId/topics/order', validateBody(reorderTopicsSchema), controller.reorder);

router.get('/:programmeId/topics', controller.list);
router.post('/:programmeId/topics', validateBody(addProgrammeTopicSchema), controller.add);
router.delete('/:programmeId/topics/:topicId', controller.remove);

export { router as adminProgrammeTopicsRoutes };

// Mount in app.ts, right after the programmes router (same prefix, deeper paths):
//   import { adminProgrammeTopicsRoutes } from './modules/programme-topics/programme-topics.routes.js';
//   app.use('/api/admin/programmes', adminProgrammeTopicsRoutes);