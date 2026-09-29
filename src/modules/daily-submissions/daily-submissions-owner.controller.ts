import { Request, Response } from 'express';
import { and, eq } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { students } from '../../db/schema.js';
import { DailySubmissionService, DailySubmissionError } from './daily-submissions.service.js';
import { listDailySubmissionsQuerySchema } from './daily-submissions.validation.js';

const service = new DailySubmissionService();

function fail(err: unknown, res: Response, fallback: string) {
  if (err instanceof DailySubmissionError) return res.status(err.status).json({ message: err.message });
  console.error(err);
  return res.status(500).json({ message: fallback });
}

async function studentBelongsToEducator(studentId: string, educatorId: string) {
  const [row] = await db
    .select({ id: students.id })
    .from(students)
    .where(and(eq(students.id, studentId), eq(students.educatorId, educatorId)))
    .limit(1);
  return !!row;
}

export class DailySubmissionOwnerController {
  // GET /api/educators/students/:studentId/daily-submissions
  async listAsEducator(req: Request<{ studentId: string }>, res: Response) {
    if (!(await studentBelongsToEducator(req.params.studentId, req.educatorProfile!.id))) {
      return res.status(404).json({ message: 'Student not found' });
    }
    const parsed = listDailySubmissionsQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ message: 'Invalid query parameters' });
    try {
      return res.json(await service.listForStudent(req.params.studentId, parsed.data));
    } catch (err) {
      return fail(err, res, 'Error loading daily submissions');
    }
  }

  // POST /api/educators/students/:studentId/daily-submissions/:submissionId/reopen
  async reopenAsEducator(req: Request<{ studentId: string; submissionId: string }>, res: Response) {
    if (!(await studentBelongsToEducator(req.params.studentId, req.educatorProfile!.id))) {
      return res.status(404).json({ message: 'Student not found' });
    }
    const day = await service.reopen(req.params.studentId, req.params.submissionId);
    if (!day) return res.status(404).json({ message: 'Submission not found' });
    return res.json(day);
  }

  // GET /api/admin/students/:studentId/daily-submissions — no ownership check
  async listAsAdmin(req: Request<{ studentId: string }>, res: Response) {
    if (!(await service.studentExists(req.params.studentId))) {
      return res.status(404).json({ message: 'Student not found' });
    }
    const parsed = listDailySubmissionsQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ message: 'Invalid query parameters' });
    try {
      return res.json(await service.listForStudent(req.params.studentId, parsed.data));
    } catch (err) {
      return fail(err, res, 'Error loading daily submissions');
    }
  }

  // POST /api/admin/students/:studentId/daily-submissions/:submissionId/reopen
  async reopenAsAdmin(req: Request<{ studentId: string; submissionId: string }>, res: Response) {
    const day = await service.reopen(req.params.studentId, req.params.submissionId);
    if (!day) return res.status(404).json({ message: 'Submission not found' });
    return res.json(day);
  }
}