import { eq, and, or, ilike, desc } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { db } from '../../config/db.js';
import { users, students, guardians, programmes, classes, educators } from '../../db/schema.js';
import { generateArqId, generateTempPassword } from '../../utils/generate-arq-id.js';

export type GuardianInput = {
  fullName: string;
  phone?: string;
  email?: string;
  relationship?: string;
};

type EnrollData = {
  firstName: string;
  lastName: string;
  email: string;
  classId?: string;
  programId?: string;
  academicLevel?: string;
  phone?: string;
  password?: string;
  guardian?: GuardianInput;
};

export type StudentPatch = {
  firstName?: string;
  lastName?: string;
  email?: string;
  academicLevel?: string | null;
  phone?: string | null;
  classId?: string | null;
  programId?: string | null;
  educatorId?: string | null;
  active?: boolean;
  guardian?: GuardianInput;
};

export class StudentService {

  // ------------------------------------------------------------
  // Enrolment. `educatorId` is null when an admin enrols without assigning one.
  // ------------------------------------------------------------
  async enrollStudent(data: EnrollData, educatorId: string | null) {
    const tempPassword = data.password ?? generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    const arqId = generateArqId();

    const [newUser] = await db
      .insert(users)
      .values({ email: data.email, password: hashedPassword, firstName: data.firstName, lastName: data.lastName, role: 'student', arqId, verified: false, active: true })
      .returning();

    try {
      const [studentProfile] = await db
        .insert(students)
        .values({
          userId: newUser.id,
          educatorId,
          classId: data.classId ?? null,
          programId: data.programId ?? null,
          academicLevel: data.academicLevel,
          phone: data.phone,
        })
        .returning();

      let guardian = null;
      if (data.guardian) {
        const [row] = await db
          .insert(guardians)
          .values({ studentId: studentProfile.id, ...data.guardian, isPrimary: true })
          .returning();
        guardian = row;
      }

      return { student: studentProfile, user: newUser, guardian, generatedPassword: data.password ? null : tempPassword };
    } catch (err) {
      // No transaction here (works with any Drizzle driver). Deleting the user cascades
      // to the student and guardian rows, so a failed enrolment leaves nothing behind.
      await db.delete(users).where(eq(users.id, newUser.id));
      throw err;
    }
  }

  // Returns a message if the class / programme / educator doesn't exist, otherwise null.
  async findPlacementError(data: { classId?: string; programId?: string; educatorId?: string }) {
    if (data.classId) {
      const [row] = await db.select({ id: classes.id }).from(classes).where(eq(classes.id, data.classId)).limit(1);
      if (!row) return 'Class not found';
    }
    if (data.programId) {
      const [row] = await db
        .select({ id: programmes.id, status: programmes.status })
        .from(programmes)
        .where(eq(programmes.id, data.programId))
        .limit(1);
      if (!row) return 'Programme not found';
      if (row.status !== 'published') return 'Programme is not open for enrolment';
    }
    if (data.educatorId) {
      const [row] = await db.select({ id: educators.id }).from(educators).where(eq(educators.id, data.educatorId)).limit(1);
      if (!row) return 'Educator not found';
    }
    return null;
  }

  async findUserByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user || null;
  }

  // ------------------------------------------------------------
  // Educator views (unchanged)
  // ------------------------------------------------------------
  // ------------------------------------------------------------
  // Educator views
  // ------------------------------------------------------------
  async listStudentsForEducator(educatorId: string) {
    return db
      .select({
        id: students.id,
        userId: students.userId,
        educatorId: students.educatorId,
        programId: students.programId,
        programmeTitle: programmes.title,
        enrollmentDate: students.enrollmentDate,
        academicLevel: students.academicLevel,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        arqId: users.arqId,
      })
      .from(students)
      .innerJoin(users, eq(students.userId, users.id))
      .leftJoin(programmes, eq(students.programId, programmes.id))
      .where(eq(students.educatorId, educatorId));
  }

  async getStudentBelongingToEducator(studentId: string, educatorId: string) {
    const [student] = await db
      .select({
        id: students.id,
        userId: students.userId,
        educatorId: students.educatorId,
        programId: students.programId,
        programmeTitle: programmes.title,
        enrollmentDate: students.enrollmentDate,
        academicLevel: students.academicLevel,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        arqId: users.arqId,
      })
      .from(students)
      .innerJoin(users, eq(students.userId, users.id))
      .leftJoin(programmes, eq(students.programId, programmes.id))
      .where(
        and(
          eq(students.id, studentId),
          eq(students.educatorId, educatorId)
        )
      )
      .limit(1);

    return student || null;
  }

  // ------------------------------------------------------------
  // Admin views (new)
  // ------------------------------------------------------------
  async listStudents(opts: { programId?: string; educatorId?: string; search?: string; limit: number; offset: number }) {
    const term = opts.search ? `%${opts.search}%` : null;

    return db
      .select({
        id: students.id,
        userId: students.userId,
        educatorId: students.educatorId,
        classId: students.classId,
        programId: students.programId,
        programmeTitle: programmes.title,
        enrollmentDate: students.enrollmentDate,
        academicLevel: students.academicLevel,
        phone: students.phone,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        arqId: users.arqId,
        active: users.active,
      })
      .from(students)
      .innerJoin(users, eq(students.userId, users.id))
      .leftJoin(programmes, eq(students.programId, programmes.id))
      .where(
        and(
          opts.programId ? eq(students.programId, opts.programId) : undefined,
          opts.educatorId ? eq(students.educatorId, opts.educatorId) : undefined,
          term
            ? or(ilike(users.firstName, term), ilike(users.lastName, term), ilike(users.email, term))
            : undefined
        )
      )
      .orderBy(desc(students.enrollmentDate))
      .limit(opts.limit)
      .offset(opts.offset);
  }

  async getStudentDetail(studentId: string) {
    const [student] = await db
      .select({
        id: students.id,
        userId: students.userId,
        educatorId: students.educatorId,
        classId: students.classId,
        programId: students.programId,
        programmeTitle: programmes.title,
        enrollmentDate: students.enrollmentDate,
        academicLevel: students.academicLevel,
        phone: students.phone,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        arqId: users.arqId,
        active: users.active,
      })
      .from(students)
      .innerJoin(users, eq(students.userId, users.id))
      .leftJoin(programmes, eq(students.programId, programmes.id))
      .where(eq(students.id, studentId))
      .limit(1);

    if (!student) return null;

    const guardianRows = await db
      .select()
      .from(guardians)
      .where(eq(guardians.studentId, studentId))
      .orderBy(desc(guardians.isPrimary));

    return { ...student, guardians: guardianRows };
  }

  async updateStudent(studentId: string, patch: StudentPatch) {
    const [student] = await db
      .select({ id: students.id, userId: students.userId })
      .from(students)
      .where(eq(students.id, studentId))
      .limit(1);
    if (!student) return null;

    const userSet: Partial<typeof users.$inferInsert> = {};
    if (patch.firstName !== undefined) userSet.firstName = patch.firstName;
    if (patch.lastName !== undefined) userSet.lastName = patch.lastName;
    if (patch.email !== undefined) userSet.email = patch.email;
    if (patch.active !== undefined) userSet.active = patch.active;
    if (Object.keys(userSet).length) {
      await db.update(users).set(userSet).where(eq(users.id, student.userId));
    }

    const studentSet: Partial<typeof students.$inferInsert> = {};
    if (patch.academicLevel !== undefined) studentSet.academicLevel = patch.academicLevel;
    if (patch.phone !== undefined) studentSet.phone = patch.phone;
    if (patch.classId !== undefined) studentSet.classId = patch.classId;
    if (patch.programId !== undefined) studentSet.programId = patch.programId;
    if (patch.educatorId !== undefined) studentSet.educatorId = patch.educatorId;
    if (Object.keys(studentSet).length) {
      await db.update(students).set(studentSet).where(eq(students.id, studentId));
    }

    if (patch.guardian) {
      const [primary] = await db
        .select({ id: guardians.id })
        .from(guardians)
        .where(and(eq(guardians.studentId, studentId), eq(guardians.isPrimary, true)))
        .limit(1);

      if (primary) {
        await db.update(guardians).set(patch.guardian).where(eq(guardians.id, primary.id));
      } else {
        await db.insert(guardians).values({ studentId, ...patch.guardian, isPrimary: true });
      }
    }

    return this.getStudentDetail(studentId);
  }

  // "Delete" = deactivate. Hard-deleting a user would cascade into plans, payments and logs.
  async deactivateStudent(studentId: string) {
    return this.updateStudent(studentId, { active: false });
  }
}