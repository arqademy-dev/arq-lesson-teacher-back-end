import { Router } from 'express';
import { WeeklyQuizzesController } from './weekly-quizzes.controller.js';
import { WeeklyQuizzesOwnerController } from './weekly-quizzes-owner.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { requireApprovedEducator } from '../../middleware/educator.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { saveAnswerSchema } from './weekly-quizzes.validation.js';

const student = new WeeklyQuizzesController();
const owner = new WeeklyQuizzesOwnerController();

// ---------------- Student ----------------
const studentRouter = Router();
studentRouter.use(authenticate, requireRole('student'));

studentRouter.get('/plan/:learningPlanId', student.list); // history: every week, status, score
studentRouter.get('/:weeklyQuizId', student.getDetail); // answers hidden until submitted
studentRouter.put('/:weeklyQuizId/answers/:questionId', validateBody(saveAnswerSchema), student.saveAnswer);
studentRouter.post('/:weeklyQuizId/submit', student.submit);

// ---------------- Admin (read-only) ----------------
const adminRouter = Router();
adminRouter.use(authenticate, requireRole('admin'));
adminRouter.get('/learning-plans/:learningPlanId/weekly-quizzes', owner.listAsAdmin);
adminRouter.get('/weekly-quizzes/:weeklyQuizId', owner.getDetailAsAdmin);

// ---------------- Educator (read-only, own students) ----------------
const educatorRouter = Router();
educatorRouter.use(authenticate, requireRole('educator'), requireApprovedEducator);
educatorRouter.get('/learning-plans/:learningPlanId/weekly-quizzes', owner.listAsEducator);

export {
  studentRouter as studentWeeklyQuizRoutes,
  adminRouter as adminWeeklyQuizRoutes,
  educatorRouter as educatorWeeklyQuizRoutes,
};

// Mount in app.ts:
//   app.use('/api/students/me/quizzes', studentWeeklyQuizRoutes);
//   app.use('/api/admin', adminWeeklyQuizRoutes);
//   app.use('/api/educators', educatorWeeklyQuizRoutes);