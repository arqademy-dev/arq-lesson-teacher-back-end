import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import 'dotenv/config';

import { userRoutes } from './modules/users/users.routes.js';
import { openApiDocument } from './docs/openapi.js';

export const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || true, credentials: true }));
app.use(express.json());
app.use(cookieParser(process.env.JWT_SECRET || 'fallback-cookie-signing-key-string'));

app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.use('/api/users', userRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});