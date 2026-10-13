import { Request, Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { students } from '../../db/schema.js';
import { ProgrammeLearningPlanService, ProgrammePlanError } from './programme-learning-plan.service.js';
import type { CreateProgrammePlanBody } from './programme-learning-plan.validation.js';

const service = new ProgrammeLearningPlanService();

function fail(err: unknown, res: Response, fallback: string) {
  if (err instanceof ProgrammePlanError) return res.status(err.status).json({ message: err.message });
  console.error(err);
  return res.status(500).json({ message: fallback });
}

export class ProgrammeLearningPlanController {
  async createAsAdmin(req: Request<{ studentId: string }>, res: Response) {
    try {
      const result = await service.create(req.params.studentId, req.body as CreateProgrammePlanBody);
      return res.status(201).json(result);
    } catch (err) {
      return fail(err, res, 'Error creating learning plan');
    }
  }

  async getForStudentAsAdmin(req: Request<{ studentId: string }>, res: Response) {
    try {
      const result = await service.getForStudent(req.params.studentId);
      if (!result) return res.status(404).json({ message: 'No plan yet for this student' });
      return res.json(result);
    } catch (err) {
      return fail(err, res, 'Error loading plan');
    }
  }

  async updateAsAdmin(req: Request<{ studentId: string; planId: string }>, res: Response) {
    try {
      const plan = await service.update(req.params.planId, req.params.studentId, req.body);
      return res.json(plan);
    } catch (err) {
      return fail(err, res, 'Error updating plan');
    }
  }

  async createAsEducator(req: Request<{ studentId: string }>, res: Response) {
    const [owned] = await db
      .select({ id: students.id })
      .from(students)
      .where(and(eq(students.id, req.params.studentId), eq(students.educatorId, req.educatorProfile!.id)))
      .limit(1);
    if (!owned) return res.status(404).json({ message: 'Student not found' });

    try {
      const result = await service.create(req.params.studentId, req.body as CreateProgrammePlanBody);
      return res.status(201).json(result);
    } catch (err) {
      return fail(err, res, 'Error creating learning plan');
    }
  }
}