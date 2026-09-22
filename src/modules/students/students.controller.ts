import { Request, Response } from 'express';
import { StudentService } from './students.service.js';
import { AdminStudentsService } from '../admin/admin-students.service.js';

const studentService = new StudentService();
const adminStudentsService = new AdminStudentsService();

export class StudentController {
  async enroll(req: Request, res: Response) {
    try {
      const existing = await studentService.findUserByEmail(req.body.email);
      if (existing) {
        return res.status(400).json({ message: 'A user with this email already exists' });
      }

      // NEW: make sure the class / programme actually exists (otherwise the FK error becomes a vague 500)
      const placementError = await studentService.findPlacementError(req.body);
      if (placementError) {
        return res.status(400).json({ message: placementError });
      }

      const { student, user, guardian, generatedPassword } = await studentService.enrollStudent(
        req.body,
        req.educatorProfile!.id
      );

      return res.status(201).json({
        message: 'Student enrolled successfully',
        student: {
          id: student.id,
          academicLevel: student.academicLevel,
          enrollmentDate: student.enrollmentDate,
          // new keys are additive, so existing clients are unaffected
          programId: student.programId,
          classId: student.classId,
          guardian: guardian ? { id: guardian.id, fullName: guardian.fullName } : null,
        },
        credentials: {
          email: user.email,
          arqId: user.arqId,
          // Only present if you didn't supply your own password — share this with the parent/student once.
          temporaryPassword: generatedPassword,
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Error enrolling student' });
    }
  }

  async listMyStudents(req: Request, res: Response) {
    const list = await studentService.listStudentsForEducator(req.educatorProfile!.id);
    return res.json(list);
  }

  async getOne(req: Request<{ id: string }>, res: Response) {
    const student = await studentService.getStudentBelongingToEducator(req.params.id, req.educatorProfile!.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    return res.json(student);
  }

  async getLearningHistory(req: Request, res: Response) {
    const studentId = req.params.id as string;
    const student = await studentService.getStudentBelongingToEducator(studentId, req.educatorProfile!.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const history = await adminStudentsService.getStudentLearningHistory(studentId);
    return res.json(history);
  }

}