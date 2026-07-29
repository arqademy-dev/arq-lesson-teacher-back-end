import { Request, Response } from 'express';
import { StudentService } from './students.service.js';

const studentService = new StudentService();

export class StudentController {
  async enroll(req: Request, res: Response) {
    try {
      const existing = await studentService.findUserByEmail(req.body.email);
      if (existing) {
        return res.status(400).json({ message: 'A user with this email already exists' });
      }

      const { student, user, generatedPassword } = await studentService.enrollStudent(
        req.body,
        req.educatorProfile!.id
      );

      return res.status(201).json({
        message: 'Student enrolled successfully',
        student: {
          id: student.id,
          academicLevel: student.academicLevel,
          enrollmentDate: student.enrollmentDate,
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

}