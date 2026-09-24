import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
// import helmet = require('helmet');
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import 'dotenv/config';

import { userRoutes } from './modules/users/users.routes.js';
import { openApiDocument } from './docs/openapi.js';

import { adminRoutes } from './modules/admin/admin.routes.js';
import { curriculumRoutes } from './modules/curriculum/curriculum.routes.js';
import { interactiveRoutes } from './modules/interactive/interactive.routes.js';

import { studentsRoutes } from './modules/students/students.routes.js';
import { learningPlanRoutes, studentLearningPlanRoutes } from './modules/learning-plans/learning-plans.routes.js';

import { studentAuthRoutes } from './modules/students/students-auth.routes.js';
import { studentPaymentRoutes, adminPaymentRoutes } from './modules/payments/payments.routes.js';
import { dailyRoutes } from './modules/daily/daily.routes.js';

import { filesRoutes, studentFilesRoutes } from './modules/files/files.routes.js';
import { adminDashboardRoutes } from './modules/dashboard/admin-dashboard.routes.js';
import { educatorDashboardRoutes } from './modules/dashboard/educator-dashboard.routes.js';
import { studentDashboardRoutes } from './modules/dashboard/student-dashboard.routes.js';
import { adminReportRoutes, educatorReportRoutes, studentReportRoutes } from './modules/reports/reports.routes.js';
import { adminStudentsRoutes } from './modules/admin/admin-students.routes.js';

import { adminProgrammesRoutes, educatorProgrammesRoutes } from './modules/programmes/programmes.routes.js';

import { adminLearningPlansRoutes } from './modules/admin/admin-learning-plans.routes.js';
import { studentFileHistoryRoutes, educatorFileHistoryRoutes, adminFileHistoryRoutes } from './modules/files/file-history.routes.js';
import { adminQuestionBankRoutes } from './modules/question-bank/question-bank.routes.js';
import { adminProgrammeTopicsRoutes } from './modules/programme-topics/programme-topics.routes.js';
import { adminProgrammePlanRoutes, educatorProgrammePlanRoutes } from './modules/programme-learning-plan/programme-learning-plan.routes.js';
import { adminProgrammePricesRoutes } from './modules/programme-prices/programme-prices.routes.js';
import { adminWeeklyQuizRoutes, educatorWeeklyQuizRoutes } from './modules/weekly-quizzes/weekly-quizzes-owner.routes.js';
import { studentWeeklyQuizRoutes } from './modules/weekly-quizzes/weekly-quizzes.routes.js';

import { adminStudentEnrollmentRoutes } from './modules/students/students-admin.routes.js';

export const app = express();

// ------------------------------------------------------------
// Global Middlewares & Configuration
// ------------------------------------------------------------
app.use(helmet());
// app.use(cors({ origin: process.env.CLIENT_URL || true, credentials: true }));
app.use(helmet());

const allowedOrigins = [
  process.env.CLIENT_URL,
  ...(process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()) || []),
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // !origin allows server-to-server requests, curl, and tools like Postman
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser(process.env.JWT_SECRET || 'fallback-cookie-signing-key-string'));

// ------------------------------------------------------------
// Core & Documentation Routes
// ------------------------------------------------------------
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
app.use('/api/users', userRoutes);
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ------------------------------------------------------------
// Admin Routes (/api/admin)
// ------------------------------------------------------------
app.use('/api/admin', adminRoutes);
app.use('/api/admin/curriculum', curriculumRoutes);
app.use('/api/admin/curriculum', interactiveRoutes);
app.use('/api/admin/students', adminStudentEnrollmentRoutes);
app.use('/api/admin/students', adminStudentsRoutes);
app.use('/api/admin/students', adminReportRoutes);        // GET /api/admin/students/:studentId/report
app.use('/api/admin/students', adminFileHistoryRoutes);              // GET /api/admin/students/:studentId/files
app.use('/api/admin/questions', adminQuestionBankRoutes);
app.use('/api/admin/learning-plans', adminLearningPlansRoutes);
app.use('/api/admin/files', filesRoutes);
app.use('/api/admin/payments', adminPaymentRoutes);
app.use('/api/admin/dashboard', adminDashboardRoutes);
app.use('/api/admin/programmes', adminProgrammesRoutes);
app.use('/api/admin/programmes', adminProgrammeTopicsRoutes);

app.use('/api/admin/programme-prices', adminProgrammePricesRoutes);
app.use('/api/students/me/weekly-quizzes', studentWeeklyQuizRoutes);


app.use('/api/admin/students', adminProgrammePlanRoutes);
app.use('/api/educators/students', educatorProgrammePlanRoutes);
app.use('/api/admin', adminWeeklyQuizRoutes);
app.use('/api/educators', educatorWeeklyQuizRoutes);

// ------------------------------------------------------------
// Educator Routes (/api/educators)
// ------------------------------------------------------------
app.use('/api/educators/students', studentsRoutes);
app.use('/api/educators/students', educatorReportRoutes); // GET /api/educators/students/:studentId/report — safe alongside the existing enroll/list routes at this same prefix, since /:id and /:studentId/report never collide
app.use('/api/educators/students', educatorFileHistoryRoutes);       // GET /api/educators/students/:studentId/files
app.use('/api/educators/learning-plans', learningPlanRoutes);
app.use('/api/educators/dashboard', educatorDashboardRoutes);
app.use('/api/educators/programmes', educatorProgrammesRoutes);
 app.use('/api/educators/programmes', educatorProgrammesRoutes);

// ------------------------------------------------------------
// Student Routes (/api/students)
// ------------------------------------------------------------
app.use('/api/students', studentAuthRoutes);
app.use('/api/students/payments', studentPaymentRoutes);
app.use('/api/students/me', dailyRoutes);
app.use('/api/students/me', studentReportRoutes);          // GET /api/students/me/report
app.use('/api/students/me/files', studentFilesRoutes);
app.use('/api/students/me/files/history', studentFileHistoryRoutes); // GET /api/students/me/files/history
app.use('/api/students/me/dashboard', studentDashboardRoutes);
app.use('/api/students/me/learning-plan', studentLearningPlanRoutes); // NEW

app.use('/api/admin/students', adminStudentEnrollmentRoutes);
// ------------------------------------------------------------
// Fallback & Error Handlers
// ------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});
