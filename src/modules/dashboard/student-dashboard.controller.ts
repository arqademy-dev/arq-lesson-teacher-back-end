// student-dashboard.controller.ts
import { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { students } from '../../db/schema.js';
import { StudentDashboardService } from './student-dashboard.service.js';

const service = new StudentDashboardService();

export class StudentDashboardController {
  async getSummary(req: Request, res: Response) {
    const [profile] = await db.select().from(students).where(eq(students.userId, req.user!.id)).limit(1);
    if (!profile) return res.status(404).json({ message: 'Student profile not found' });
    return res.json(await service.getSummary(profile.id));
  }
}