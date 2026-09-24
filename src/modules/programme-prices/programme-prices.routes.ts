import { Router } from 'express';
import { ProgrammePricesController } from './programme-prices.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { createProgrammePriceSchema, updateProgrammePriceSchema } from './programme-prices.validation.js';

const router = Router();
const controller = new ProgrammePricesController();

router.use(authenticate, requireRole('admin'));

router.post('/', validateBody(createProgrammePriceSchema), controller.create);
router.patch('/:id', validateBody(updateProgrammePriceSchema), controller.update);
router.get('/programme/:programmeId', controller.listForProgramme);

export { router as adminProgrammePricesRoutes };

// Mount in app.ts:
//   app.use('/api/admin/programme-prices', adminProgrammePricesRoutes);