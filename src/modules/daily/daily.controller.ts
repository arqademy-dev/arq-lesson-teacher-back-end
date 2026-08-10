import { Request, Response } from 'express';
import { db } from '../../config/db.js';
import { students } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { DailyService } from './daily.service.js';

const dailyService = new DailyService();

async function getStudentId(userId: string) {
  const [profile] = await db.select().from(students).where(eq(students.userId, userId)).limit(1);
  return profile?.id || null;
}

export class DailyController {
  async getCurrent(req: Request, res: Response) {
    const studentId = await getStudentId(req.user!.id);
    if (!studentId) return res.status(404).json({ message: 'Student profile not found' });

    const current = await dailyService.getCurrentSession(studentId);
    if (!current) {
      return res.json({ message: 'No active session available yet — payment may be pending, or your plan is fully complete.' });
    }
    return res.json(current);
  }

  // Explicitly type req.params.sessionId as a string
  async complete(req: Request<{ sessionId: string }>, res: Response) {
    const studentId = await getStudentId(req.user!.id);
    if (!studentId) return res.status(404).json({ message: 'Student profile not found' });

    try {
      const updated = await dailyService.completeSession(studentId, req.params.sessionId);
      return res.json({ message: 'Session marked complete — next day unlocked', session: updated });
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }
  }

  async submit(req: Request, res: Response) {
    const studentId = await getStudentId(req.user!.id);
    if (!studentId) return res.status(404).json({ message: 'Student profile not found' });

    try {
      const result = await dailyService.submitInteraction(studentId, req.body);
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }
  }

  async getSessionSubmissions(req: Request, res: Response) {
    const studentId = await getStudentId(req.user!.id);
    const sessionId = req.params.sessionId as string | undefined;
    if (!studentId) return res.status(404).json({ message: 'Student profile not found' });

    const submissions = await dailyService.getSubmissionsForSession(studentId, sessionId?.toString() || '');
    if (submissions === null) return res.status(404).json({ message: 'Session not found or does not belong to you' });
    return res.json(submissions);
  }
}
