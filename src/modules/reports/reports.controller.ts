import { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { students } from '../../db/schema.js';
import { ReportsService } from './reports.service.js';

const service = new ReportsService();

export class ReportsController {
  async adminGetReport(req: Request, res: Response) {
    const studentId = req.params.studentId as string; // Fix: Type assertion
    
    const report = await service.getStudentReport(studentId);
    if (!report) return res.status(404).json({ message: 'Student not found' });
    return res.json(report);
  }

  async educatorGetReport(req: Request, res: Response) {
    const studentId = req.params.studentId as string; // Fix: Type assertion
    
    const [student] = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
    if (!student || student.educatorId !== req.educatorProfile!.id) {
      return res.status(404).json({ message: 'Student not found' });
    }
    return res.json(await service.getStudentReport(studentId));
  }

  async studentGetOwnReport(req: Request, res: Response) {
    const [student] = await db.select().from(students).where(eq(students.userId, req.user!.id)).limit(1);
    if (!student) return res.status(404).json({ message: 'Student profile not found' });
    return res.json(await service.getStudentReport(student.id));
  }
}
