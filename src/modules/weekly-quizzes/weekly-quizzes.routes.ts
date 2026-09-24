import { Router } from 'express';
import { WeeklyQuizzesController } from './weekly-quizzes.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { saveAnswerSchema } from './weekly-quizzes.validation.js';

const controller = new WeeklyQuizzesController();

const router = Router();
router.use(authenticate, requireRole('student'));

// History: every week for one learning plan, status/score once submitted.
router.get('/plans/:learningPlanId', controller.list);

// One quiz's questions. Answer key withheld until the quiz is submitted.
router.get('/:weeklyQuizId', controller.getDetail);

// Save one answer at a time — does not grade or lock the quiz.
router.put('/:weeklyQuizId/questions/:questionId/answer', validateBody(saveAnswerSchema), controller.saveAnswer);

// Grades every question at once and locks the quiz.
router.post('/:weeklyQuizId/submit', controller.submit);

export { router as studentWeeklyQuizRoutes };

// Mount in app.ts:
//   app.use('/api/students/me/weekly-quizzes', studentWeeklyQuizRoutes);