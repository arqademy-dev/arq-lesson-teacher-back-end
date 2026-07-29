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

export const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || true, credentials: true }));
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

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});