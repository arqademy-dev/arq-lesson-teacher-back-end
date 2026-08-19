import { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { students } from '../../db/schema.js';
import { FileHistoryService } from './file-history.service.js';

const service = new FileHistoryService();

export class FileHistoryController {
  async studentGetOwn(req: Request, res: Response) {
    const [profile] = await db.select().from(students).where(eq(students.userId, req.user!.id)).limit(1);
    if (!profile) return res.status(404).json({ message: 'Student profile not found' });
    return res.json(await service.getFileHistoryForStudent(profile.id));
  }

  async educatorGetForStudent(req: Request, res: Response) {
    const studentId = req.params.studentId as string;
    const [student] = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
    if (!student || student.educatorId !== req.educatorProfile!.id) return res.status(404).json({ message: 'Student not found' });
    return res.json(await service.getFileHistoryForStudent(studentId));
  }

  async adminGetForStudent(req: Request, res: Response) {
    const studentId = req.params.studentId as string;
    const [student] = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    return res.json(await service.getFileHistoryForStudent(studentId));
  }
}