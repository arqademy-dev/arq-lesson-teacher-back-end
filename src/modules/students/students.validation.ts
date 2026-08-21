import { z } from 'zod';

export const enrollStudentSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  classId: z.string().uuid(), // NEW — required
  academicLevel: z.string().max(50).optional(),
  password: z.string().min(6).optional(),
});