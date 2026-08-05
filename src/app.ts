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
import { learningPlanRoutes } from './modules/learning-plans/learning-plans.routes.js';

import { studentAuthRoutes } from './modules/students/students-auth.routes.js';
import { studentPaymentRoutes, adminPaymentRoutes } from './modules/payments/payments.routes.js';
import { dailyRoutes } from './modules/daily/daily.routes.js';

import { filesRoutes } from './modules/files/files.routes.js';
import { adminDashboardRoutes } from './modules/dashboard/admin-dashboard.routes.js';
import { educatorDashboardRoutes } from './modules/dashboard/educator-dashboard.routes.js';
import { studentDashboardRoutes } from './modules/dashboard/student-dashboard.routes.js';
import { adminReportRoutes, educatorReportRoutes, studentReportRoutes } from './modules/reports/reports.routes.js';


export const app = express();

app.use(helmet());
// app.use(cors({ origin: process.env.CLIENT_URL || true, credentials: true }));
const allowedOrigins = [
  process.env.CLIENT_URL,
  ...(process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()) || []),
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
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

app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.use('/api/users', userRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));


app.use('/api/admin', adminRoutes);
app.use('/api/admin/curriculum', curriculumRoutes);
app.use('/api/admin/curriculum', interactiveRoutes);

app.use('/api/educators/students', studentsRoutes);
app.use('/api/educators/learning-plans', learningPlanRoutes);

app.use('/api/students', studentAuthRoutes);
app.use('/api/students/payments', studentPaymentRoutes);
app.use('/api/admin/payments', adminPaymentRoutes);
app.use('/api/students/me', dailyRoutes);

app.use('/api/admin/files', filesRoutes);
app.use('/api/admin/dashboard', adminDashboardRoutes);
app.use('/api/educators/dashboard', educatorDashboardRoutes);
app.use('/api/students/me/dashboard', studentDashboardRoutes);
app.use('/api/admin/students', adminReportRoutes);        // GET /api/admin/students/:studentId/report
app.use('/api/educators/students', educatorReportRoutes); // GET /api/educators/students/:studentId/report — safe alongside the existing enroll/list routes at this same prefix, since /:id and /:studentId/report never collide
app.use('/api/students/me', studentReportRoutes);          // GET /api/students/me/report

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});