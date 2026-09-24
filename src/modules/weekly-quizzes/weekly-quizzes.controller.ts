import { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { students } from '../../db/schema.js';
import { WeeklyQuizService, WeeklyQuizError } from './weekly-quizzes.service.js';
import type { SaveAnswerBody } from './weekly-quizzes.validation.js';

const service = new WeeklyQuizService();

async function getStudentId(userId: string) {
  const [row] = await db.select({ id: students.id }).from(students).where(eq(students.userId, userId)).limit(1);
  return row?.id ?? null;
}

function fail(err: unknown, res: Response, fallback: string) {
  if (err instanceof WeeklyQuizError) return res.status(err.status).json({ message: err.message });
  console.error(err);
  return res.status(500).json({ message: fallback });
}

export class WeeklyQuizzesController {
  async list(req: Request<{ learningPlanId: string }>, res: Response) {
    const studentId = await getStudentId(req.user!.id);
    if (!studentId) return res.status(404).json({ message: 'Student profile not found' });
    try {
      return res.json(await service.list(req.params.learningPlanId, studentId));
    } catch (err) {
      return fail(err, res, 'Error loading quizzes');
    }
  }

  async getDetail(req: Request<{ weeklyQuizId: string }>, res: Response) {
    const studentId = await getStudentId(req.user!.id);
    if (!studentId) return res.status(404).json({ message: 'Student profile not found' });
    try {
      return res.json(await service.getDetail(req.params.weeklyQuizId, studentId));
    } catch (err) {
      return fail(err, res, 'Error loading quiz');
    }
  }

  async saveAnswer(req: Request<{ weeklyQuizId: string; questionId: string }>, res: Response) {
    const studentId = await getStudentId(req.user!.id);
    if (!studentId) return res.status(404).json({ message: 'Student profile not found' });
    try {
      const result = await service.saveAnswer(req.params.weeklyQuizId, req.params.questionId, studentId, req.body as SaveAnswerBody);
      return res.json(result);
    } catch (err) {
      return fail(err, res, 'Error saving answer');
    }
  }

  async submit(req: Request<{ weeklyQuizId: string }>, res: Response) {
    const studentId = await getStudentId(req.user!.id);
    if (!studentId) return res.status(404).json({ message: 'Student profile not found' });
    try {
      return res.json(await service.submit(req.params.weeklyQuizId, studentId));
    } catch (err) {
      return fail(err, res, 'Error submitting quiz');
    }
  }
}