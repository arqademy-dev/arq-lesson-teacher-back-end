import { Router } from 'express';
import { ProgrammesController } from './programmes.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { requireApprovedEducator } from '../../middleware/educator.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { createProgrammeSchema, updateProgrammeSchema } from './programmes.validation.js';

const controller = new ProgrammesController();

// ---------------- Admin: full CRUD ----------------
const adminRouter = Router();
adminRouter.use(authenticate, requireRole('admin'));

adminRouter.post('/', validateBody(createProgrammeSchema), controller.create);
adminRouter.get('/', controller.list);
adminRouter.get('/:id', controller.getOne);
adminRouter.patch('/:id', validateBody(updateProgrammeSchema), controller.update);
adminRouter.delete('/:id', controller.remove);

// ---------------- Educator: read-only, published programmes ----------------
// Lets the enrol-student form offer a programme dropdown.
const educatorRouter = Router();
educatorRouter.use(authenticate, requireRole('educator'), requireApprovedEducator);

educatorRouter.get('/', controller.listPublished);
educatorRouter.get('/:id', controller.getPublished);

export { adminRouter as adminProgrammesRoutes, educatorRouter as educatorProgrammesRoutes };

// Mount in app.ts:
//   import { adminProgrammesRoutes, educatorProgrammesRoutes } from './modules/programmes/programmes.routes.js';
//   app.use('/api/admin/programmes', adminProgrammesRoutes);
//   app.use('/api/educators/programmes', educatorProgrammesRoutes);