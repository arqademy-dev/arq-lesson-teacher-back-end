import { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { students } from '../../db/schema.js';
import { DailySubmissionService, DailySubmissionError } from './daily-submissions.service.js';
import { listDailySubmissionsQuerySchema, type SaveNoteBody, type AddFilesBody } from './daily-submissions.validation.js';

const service = new DailySubmissionService();

function fail(err: unknown, res: Response, fallback: string) {
  if (err instanceof DailySubmissionError) return res.status(err.status).json({ message: err.message });
  console.error(err);
  return res.status(500).json({ message: fallback });
}

async function getStudentId(userId: string) {
  const [row] = await db.select({ id: students.id }).from(students).where(eq(students.userId, userId)).limit(1);
  return row?.id ?? null;
}

export class DailySubmissionController {
  // GET /api/students/me/daily-submissions
  async list(req: Request, res: Response) {
    const studentId = await getStudentId(req.user!.id);
    if (!studentId) return res.status(404).json({ message: 'Student profile not found' });

    const parsed = listDailySubmissionsQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ message: 'Invalid query parameters' });

    try {
      return res.json(await service.listForStudent(studentId, parsed.data));
    } catch (err) {
      return fail(err, res, 'Error loading daily submissions');
    }
  }

  // GET /api/students/me/daily-submissions/:learningPlanId/:date
  async getDay(req: Request<{ learningPlanId: string; date: string }>, res: Response) {
    const studentId = await getStudentId(req.user!.id);
    if (!studentId) return res.status(404).json({ message: 'Student profile not found' });
    try {
      return res.json(await service.getDay(studentId, req.params.learningPlanId, req.params.date));
    } catch (err) {
      return fail(err, res, 'Error loading day');
    }
  }

  // PUT /api/students/me/daily-submissions/:learningPlanId/:date
  async saveNote(req: Request<{ learningPlanId: string; date: string }, {}, SaveNoteBody>, res: Response) {
    const studentId = await getStudentId(req.user!.id);
    if (!studentId) return res.status(404).json({ message: 'Student profile not found' });
    try {
      return res.json(await service.saveNote(studentId, req.params.learningPlanId, req.params.date, req.body.summaryNote));
    } catch (err) {
      return fail(err, res, 'Error saving summary note');
    }
  }

  // POST /api/students/me/daily-submissions/:learningPlanId/:date/files
  async addFiles(req: Request<{ learningPlanId: string; date: string }, {}, AddFilesBody>, res: Response) {
    const studentId = await getStudentId(req.user!.id);
    if (!studentId) return res.status(404).json({ message: 'Student profile not found' });
    try {
      return res
        .status(201)
        .json(await service.addFiles(studentId, req.params.learningPlanId, req.params.date, req.body.files));
    } catch (err) {
      return fail(err, res, 'Error attaching files');
    }
  }

  // DELETE /api/students/me/daily-submissions/:learningPlanId/:date/files/:fileId
  async removeFile(req: Request<{ learningPlanId: string; date: string; fileId: string }>, res: Response) {
    const studentId = await getStudentId(req.user!.id);
    if (!studentId) return res.status(404).json({ message: 'Student profile not found' });
    try {
      return res.json(await service.removeFile(studentId, req.params.learningPlanId, req.params.date, req.params.fileId));
    } catch (err) {
      return fail(err, res, 'Error removing file');
    }
  }

  // POST /api/students/me/daily-submissions/:learningPlanId/:date/submit
  async submit(req: Request<{ learningPlanId: string; date: string }>, res: Response) {
    const studentId = await getStudentId(req.user!.id);
    if (!studentId) return res.status(404).json({ message: 'Student profile not found' });
    try {
      return res.json(await service.submit(studentId, req.params.learningPlanId, req.params.date));
    } catch (err) {
      return fail(err, res, 'Error submitting day');
    }
  }
}