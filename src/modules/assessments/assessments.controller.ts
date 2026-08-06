import { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { students } from '../../db/schema.js';
import { AssessmentsService } from './assessments.service.js';

const service = new AssessmentsService();

export class AssessmentsController {
  async adminGetAll(req: Request, res: Response) {
    return res.json(await service.getSystemWideActivity());
  }

  async educatorGetForStudent(req: Request, res: Response) {
    // 1. Safely extract and enforce that studentId is a single string
    const studentId = Array.isArray(req.params.studentId) 
      ? req.params.studentId[0] 
      : req.params.studentId;

    // 2. Add a quick fallback guard clause if it's missing entirely
    if (!studentId) {
      return res.status(404).json({ message: 'Student ID is required' });
    }

    // 3. Pass the safe 'studentId' variable to your Drizzle query and service
    const [student] = await db
      .select()
      .from(students)
      .where(eq(students.id, studentId))
      .limit(1);

    if (!student || student.educatorId !== req.educatorProfile!.id) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    return res.json(await service.getStudentActivity(studentId));
  }
}
