import { Request, Response } from 'express';
import { StudentService } from './students.service.js';
import {
  listStudentsQuerySchema,
  type AdminEnrollStudentBody,
  type UpdateStudentBody,
} from './students.validation.js';

const studentService = new StudentService();

export class AdminStudentsController {
  async enroll(req: Request, res: Response) {
    try {
      const body = req.body as AdminEnrollStudentBody;

      if (await studentService.findUserByEmail(body.email)) {
        return res.status(409).json({ message: 'A user with this email already exists' });
      }

      const placementError = await studentService.findPlacementError(body);
      if (placementError) return res.status(400).json({ message: placementError });

      // educatorId is optional for admins: null = unassigned, assign later via PATCH
      const { student, user, guardian, generatedPassword } = await studentService.enrollStudent(
        body,
        body.educatorId ?? null
      );

      return res.status(201).json({
        message: 'Student enrolled successfully',
        student: {
          id: student.id,
          educatorId: student.educatorId,
          programId: student.programId,
          classId: student.classId,
          academicLevel: student.academicLevel,
          enrollmentDate: student.enrollmentDate,
          guardian,
        },
        credentials: {
          email: user.email,
          arqId: user.arqId,
          temporaryPassword: generatedPassword, // null if the admin supplied a password
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Error enrolling student' });
    }
  }

  async list(req: Request, res: Response) {
    const parsed = listStudentsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid query', errors: parsed.error.flatten().fieldErrors });
    }
    return res.json(await studentService.listStudents(parsed.data));
  }

  async getOne(req: Request<{ id: string }>, res: Response) {
    const student = await studentService.getStudentDetail(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    return res.json(student);
  }

  async update(req: Request<{ id: string }>, res: Response) {
    try {
      const body = req.body as UpdateStudentBody;

      if (body.email) {
        const existing = await studentService.findUserByEmail(body.email);
        const current = await studentService.getStudentDetail(req.params.id);
        if (existing && current && existing.id !== current.userId) {
          return res.status(409).json({ message: 'A user with this email already exists' });
        }
      }

      const placementError = await studentService.findPlacementError({
        classId: body.classId ?? undefined,
        programId: body.programId ?? undefined,
        educatorId: body.educatorId ?? undefined,
      });
      if (placementError) return res.status(400).json({ message: placementError });

      const updated = await studentService.updateStudent(req.params.id, body);
      if (!updated) return res.status(404).json({ message: 'Student not found' });
      return res.json(updated);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Error updating student' });
    }
  }

  async deactivate(req: Request<{ id: string }>, res: Response) {
    const updated = await studentService.deactivateStudent(req.params.id);
    if (!updated) return res.status(404).json({ message: 'Student not found' });
    return res.json({ message: 'Student deactivated', student: updated });
  }
}