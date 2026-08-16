import { Request, Response } from 'express';
import { AdminStudentsService } from './admin-students.service.js';

const service = new AdminStudentsService();

export class AdminStudentsController {
  async listAll(req: Request, res: Response) {
    return res.json(await service.listAllStudents());
  }
  async getLearningHistory(req: Request, res: Response) {
    const { studentId } = req.params as { studentId: string };
    const history = await service.getStudentLearningHistory(studentId);
    if (!history) return res.status(404).json({ message: 'Student not found' });
    return res.json(history);
  }
  async getFullProfile(req: Request, res: Response) {
    const { studentId } = req.params as { studentId: string };
    const profile = await service.getStudentFullProfile(studentId);
    if (!profile) return res.status(404).json({ message: 'Student not found' });
    return res.json(profile);
  }
}