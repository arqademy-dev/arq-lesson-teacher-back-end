import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { db } from '../../config/db.js';
import { users, students } from '../../db/schema.js';
import { generateArqId, generateTempPassword } from '../../utils/generate-arq-id.js';

export class StudentService {

  async enrollStudent(
    data: { firstName: string; lastName: string; email: string; classId: string; academicLevel?: string; password?: string },
    educatorId: string
  ) {
    const tempPassword = data.password ?? generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    const arqId = generateArqId();

    const [newUser] = await db
      .insert(users)
      .values({ email: data.email, password: hashedPassword, firstName: data.firstName, lastName: data.lastName, role: 'student', arqId, verified: false, active: true })
      .returning();

    const [studentProfile] = await db
      .insert(students)
      .values({ userId: newUser.id, educatorId, classId: data.classId, academicLevel: data.academicLevel }) // classId added
      .returning();

    return { student: studentProfile, user: newUser, generatedPassword: data.password ? null : tempPassword };
  }

  async findUserByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user || null;
  }

  async listStudentsForEducator(educatorId: string) {
    return db
      .select({
        id: students.id,
        userId: students.userId,
        educatorId: students.educatorId,
        enrollmentDate: students.enrollmentDate,
        academicLevel: students.academicLevel,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(students)
      .innerJoin(users, eq(students.userId, users.id))
      .where(eq(students.educatorId, educatorId));
  }

  async getStudentBelongingToEducator(studentId: string, educatorId: string) {
    const [student] = await db
      .select({
        id: students.id,
        userId: students.userId,
        educatorId: students.educatorId,
        enrollmentDate: students.enrollmentDate,
        academicLevel: students.academicLevel,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
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

    return student || null;
  }

}