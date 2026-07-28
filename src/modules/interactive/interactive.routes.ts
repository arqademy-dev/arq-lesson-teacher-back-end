import { Router } from 'express';
import { InteractiveController } from './interactive.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { createInteractiveElementSchema, updateInteractiveElementSchema } from './interactive.validation.js';

const router = Router();
const controller = new InteractiveController();

router.use(authenticate, requireRole('admin'));

router.post('/resources/:resourceId/interactive-elements', validateBody(createInteractiveElementSchema), controller.create);
router.get('/resources/:resourceId/interactive-elements', controller.listByResource);
router.get('/interactive-elements/:id', controller.getById);
router.patch('/interactive-elements/:id', validateBody(updateInteractiveElementSchema), controller.update);
router.delete('/interactive-elements/:id', controller.delete);

export { router as interactiveRoutes };