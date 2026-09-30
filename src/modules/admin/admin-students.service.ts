import { eq } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { students, users, learningPlans, classes, guardians } from '../../db/schema.js';
import { LearningPlanService } from '../learning-plans/learning-plans.service.js';
import { PaymentService } from '../payments/payments.service.js';
import { educators } from '../../db/schema.js'; // add to existing schema import
import { AssessmentsService } from '../assessments/assessments.service.js';
import { programmes } from '../../db/schema.js';

const learningPlanService = new LearningPlanService();
const paymentService = new PaymentService();
const assessmentsService = new AssessmentsService();

export class AdminStudentsService {
  async listAllStudents() {
    const allStudents = await db.select().from(students);
    return Promise.all(
      allStudents.map(async (s) => {
        const [u] = await db.select().from(users).where(eq(users.id, s.userId)).limit(1);
        const [classRow] = s.classId ? await db.select().from(classes).where(eq(classes.id, s.classId)).limit(1) : [];
        const [programmeRow] = s.programId ? await db.select().from(programmes).where(eq(programmes.id, s.programId)).limit(1) : [];
        return {
          id: s.id,
          firstName: u?.firstName,
          lastName: u?.lastName,
          email: u?.email,
          arqId: u?.arqId,
          academicLevel: s.academicLevel,
          enrollmentDate: s.enrollmentDate,
          educatorId: s.educatorId,
          classId: s.classId,
          className: classRow?.title ?? null,
          programId: s.programId,
          programmeTitle: programmeRow?.title ?? null,
          programmeStatus: programmeRow?.status ?? null,
          phone: s.phone,
        };
      })
    );
  }

  async getStudentLearningHistory(studentId: string) {
    const [student] = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
    if (!student) return null;

    const [u] = await db.select().from(users).where(eq(users.id, student.userId)).limit(1);
    const plans = await db.select().from(learningPlans).where(eq(learningPlans.studentId, studentId));

    const planDetails = await Promise.all(
      plans.map(async (plan) => {
        const fullPlan = await learningPlanService.getPlanWithSchedule(plan.id);
        const isPaid = await paymentService.hasSuccessfulPayment(plan.id);
        return { ...fullPlan, isPaid };
      })
    );

    return {
      student: {
        id: student.id,
        firstName: u?.firstName,
        lastName: u?.lastName,
        email: u?.email,
        arqId: u?.arqId,
        academicLevel: student.academicLevel,
        enrollmentDate: student.enrollmentDate,
      },
      learningPlans: planDetails,
    };
  }

  // 
  async getStudentFullProfile(studentId: string) {
    const [student] = await db
      .select()
      .from(students)
      .where(eq(students.id, studentId))
      .limit(1);

    if (!student) return null;

    const [u] = await db
      .select()
      .from(users)
      .where(eq(users.id, student.userId))
      .limit(1);

    const educator = student.educatorId
      ? (
          await db
            .select()
            .from(educators)
            .where(eq(educators.id, student.educatorId))
            .limit(1)
        )[0]
      : null;

    const [classRow] = student.classId
      ? await db
          .select()
          .from(classes)
          .where(eq(classes.id, student.classId))
          .limit(1)
      : [];

    const [programmeRow] = student.programId
      ? await db
          .select()
          .from(programmes)
          .where(eq(programmes.id, student.programId))
          .limit(1)
      : [];

    const guardianRows = await db
      .select()
      .from(guardians)
      .where(eq(guardians.studentId, studentId));

    const learningPlans =
      await learningPlanService.getStudentPlanBreakdown(studentId);

    const payments =
      await paymentService.listPaymentsForStudent(studentId);

    const assessments =
      await assessmentsService.getStudentActivity(studentId, 100);

    return {
      student: {
        id: student.id,
        firstName: u?.firstName,
        lastName: u?.lastName,
        email: u?.email,
        arqId: u?.arqId,
        classId: student.classId,
        className: classRow?.title ?? null,
        programId: student.programId,
        programmeTitle: programmeRow?.title ?? null,
        programmeStatus: programmeRow?.status ?? null,
        academicLevel: student.academicLevel,
        enrollmentDate: student.enrollmentDate,
        phone: student.phone,
      },

      educator: educator
        ? {
            id: educator.id,
            firstName: educator.firstName,
            lastName: educator.lastName,
            email: educator.email,
          }
        : null,

      guardians: guardianRows.map((guardian) => ({
        id: guardian.id,
        fullName: guardian.fullName,
        phone: guardian.phone,
        email: guardian.email,
        relationship: guardian.relationship,
        isPrimary: guardian.isPrimary,
      })),

      learningPlans,
      payments,
      assessments,
    };
  }
}