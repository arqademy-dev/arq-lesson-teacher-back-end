import { Request, Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { learningPlans, students } from '../../db/schema.js';
import { WeeklyQuizService, WeeklyQuizError } from './weekly-quizzes.service.js';

const service = new WeeklyQuizService();

function fail(err: unknown, res: Response, fallback: string) {
  if (err instanceof WeeklyQuizError) return res.status(err.status).json({ message: err.message });
  console.error(err);
  return res.status(500).json({ message: fallback });
}

async function planBelongsToEducator(learningPlanId: string, educatorId: string) {
  const [row] = await db
    .select({ id: learningPlans.id })
    .from(learningPlans)
    .innerJoin(students, eq(learningPlans.studentId, students.id))
    .where(and(eq(learningPlans.id, learningPlanId), eq(students.educatorId, educatorId)))
    .limit(1);
  return !!row;
}

export class WeeklyQuizzesOwnerController {
  // Admin: no ownership check.
  async listAsAdmin(req: Request<{ learningPlanId: string }>, res: Response) {
    try {
      return res.json(await service.listForOwner(req.params.learningPlanId));
    } catch (err) {
      return fail(err, res, 'Error loading quizzes');
    }
  }

  async getDetailAsAdmin(req: Request<{ weeklyQuizId: string }>, res: Response) {
    try {
      return res.json(await service.getDetailForOwner(req.params.weeklyQuizId));
    } catch (err) {
      return fail(err, res, 'Error loading quiz');
    }
  }

  // Educator: own students' plans only.
  async listAsEducator(req: Request<{ learningPlanId: string }>, res: Response) {
    if (!(await planBelongsToEducator(req.params.learningPlanId, req.educatorProfile!.id))) {
      return res.status(404).json({ message: 'Learning plan not found' });
    }
    try {
      return res.json(await service.listForOwner(req.params.learningPlanId));
    } catch (err) {
      return fail(err, res, 'Error loading quizzes');
    }
  }
}