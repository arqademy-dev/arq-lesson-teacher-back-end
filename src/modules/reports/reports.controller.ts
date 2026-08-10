import { Request, Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { students, users } from '../../db/schema.js';
import { ReportsService } from './reports.service.js';

const service = new ReportsService();

export class ReportsController {
  async adminGetReport(req: Request, res: Response) {
    const studentId = req.params.studentId as string;
    
    const report = await service.getStudentReport(studentId);
    if (!report) return res.status(404).json({ message: 'Student not found' });
    return res.json(report);
  }

  async educatorGetReport(req: Request, res: Response) {
    const studentId = req.params.studentId as string;
    const educatorId = req.educatorProfile!.id;
    
    // Join users table to get the student's name while verifying ownership
    const [studentWithUser] = await db
      .select({
        id: students.id,
        academicLevel: students.academicLevel,
        enrollmentDate: students.enrollmentDate,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(students)
      .innerJoin(users, eq(students.userId, users.id))
      .where(
        and(
          eq(students.id, studentId),
          eq(students.educatorId, educatorId)
        )
      )
      .limit(1);

    if (!studentWithUser) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Pass the already fetched student info into the service to avoid re-querying
    const report = await service.getStudentReport(studentId, studentWithUser);
    return res.json(report);
  }

  async studentGetOwnReport(req: Request, res: Response) {
    const [student] = await db.select().from(students).where(eq(students.userId, req.user!.id)).limit(1);
    if (!student) return res.status(404).json({ message: 'Student profile not found' });
    return res.json(await service.getStudentReport(student.id));
  }
}
