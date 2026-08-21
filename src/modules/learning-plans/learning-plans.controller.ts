import { Request, Response } from 'express';
import { LearningPlanService } from './learning-plans.service.js';
import { StudentService } from '../students/students.service.js';
import { eq } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { students } from '../../db/schema.js';

const learningPlanService = new LearningPlanService();
const studentService = new StudentService();

export class LearningPlanController {
  async create(req: Request, res: Response) {
    const student = await studentService.getStudentBelongingToEducator(req.body.studentId, req.educatorProfile!.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found, or does not belong to you' });
    }

    try {
      const plan = await learningPlanService.createPlan(req.educatorProfile!.id, req.body);
      const fullPlan = await learningPlanService.getPlanWithSchedule(plan.id);
      return res.status(201).json(fullPlan);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Error creating learning plan' });
    }
  }

  async getOne(req: Request<{ id: string }>, res: Response) {
    const plan = await learningPlanService.getPlanRaw(req.params.id);
    if (!plan || plan.educatorId !== req.educatorProfile!.id) {
      return res.status(404).json({ message: 'Learning plan not found' });
    }
    const fullPlan = await learningPlanService.getPlanWithSchedule(req.params.id);
    return res.json(fullPlan);
  }

  async listForStudent(req: Request<{ studentId: string }>, res: Response) {
    const student = await studentService.getStudentBelongingToEducator(req.params.studentId, req.educatorProfile!.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const plans = await learningPlanService.listPlansForStudent(req.params.studentId);
    return res.json(plans);
  }

  async getStudentPlanBreakdown(req: Request, res: Response) {
    const { studentId } = req.params as { studentId: string };

    const student = await studentService.getStudentBelongingToEducator(studentId, req.educatorProfile!.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const breakdown = await learningPlanService.getStudentPlanBreakdown(studentId);
    return res.json(breakdown);
  }

  async updatePlan(req: Request<{ id: string }>, res: Response) {
    try {
      const plan = await learningPlanService.getPlanOwnedByEducator(req.params.id, req.educatorProfile!.id);
      if (!plan) return res.status(404).json({ message: 'Learning plan not found' });

      await learningPlanService.updatePlan(req.params.id, req.body);
      const fullPlan = await learningPlanService.getPlanWithSchedule(req.params.id);
      return res.json(fullPlan);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Error updating learning plan' });
    }
  }

  async updateSession(req: Request<{ sessionId: string }>, res: Response) {
    try {
      const result = await learningPlanService.getSessionWithPlan(req.params.sessionId);
      if (!result || result.plan.educatorId !== req.educatorProfile!.id) {
        return res.status(404).json({ message: 'Session not found' });
      }

      const updated = await learningPlanService.updateSession(req.params.sessionId, req.body);
      return res.json({ message: 'Session updated', session: updated });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Error updating session' });
    }
  }


  async getMyPlanBreakdown(req: Request, res: Response) {
    const [profile] = await db.select().from(students).where(eq(students.userId, req.user!.id)).limit(1);
    if (!profile) return res.status(404).json({ message: 'Student profile not found' });

    const breakdown = await learningPlanService.getStudentPlanBreakdown(profile.id);
    return res.json(breakdown);
  }

}
