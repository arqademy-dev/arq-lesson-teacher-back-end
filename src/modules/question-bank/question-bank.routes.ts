import { Router } from 'express';
import { QuestionBankController } from './question-bank.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import {
  bulkCreateQuestionsSchema,
  createQuestionSchema,
  updateQuestionSchema,
} from './question-bank.validation.js';

const router = Router();
const controller = new QuestionBankController();

// Admin only. These responses include correctIndex, so they must never be exposed to students.
router.use(authenticate, requireRole('admin'));

// Fixed paths first, then the parameterised ones.
router.post('/bulk', validateBody(bulkCreateQuestionsSchema), controller.bulkCreate);
router.get('/coverage', controller.coverage);

router.post('/', validateBody(createQuestionSchema), controller.create);
router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.patch('/:id', validateBody(updateQuestionSchema), controller.update);
router.delete('/:id', controller.archive);

export { router as adminQuestionBankRoutes };

// Mount in app.ts:
//   import { adminQuestionBankRoutes } from './modules/question-bank/question-bank.routes.js';
//   app.use('/api/admin/questions', adminQuestionBankRoutes);