import { eq } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { students, users, learningPlans } from '../../db/schema.js';
import { LearningPlanService } from '../learning-plans/learning-plans.service.js';
import { PaymentService } from '../payments/payments.service.js';
import { educators } from '../../db/schema.js'; // add to existing schema import
import { AssessmentsService } from '../assessments/assessments.service.js';

const learningPlanService = new LearningPlanService();
const paymentService = new PaymentService();
const assessmentsService = new AssessmentsService();

export class AdminStudentsService {
  async listAllStudents() {
    const allStudents = await db.select().from(students);
    return Promise.all(
      allStudents.map(async (s) => {
        const [u] = await db.select().from(users).where(eq(users.id, s.userId)).limit(1);
        return {
          id: s.id,
          firstName: u?.firstName,
          lastName: u?.lastName,
          email: u?.email,
          arqId: u?.arqId,
          academicLevel: s.academicLevel,
          enrollmentDate: s.enrollmentDate,
          educatorId: s.educatorId,
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

  async getStudentFullProfile(studentId: string) {
    const [student] = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
    if (!student) return null;

    const [u] = await db.select().from(users).where(eq(users.id, student.userId)).limit(1);
    const [educator] = await db.select().from(educators).where(eq(educators.id, student.educatorId)).limit(1);

    const learningPlans = await learningPlanService.getStudentPlanBreakdown(studentId);
    const payments = await paymentService.listPaymentsForStudent(studentId);
    const assessments = await assessmentsService.getStudentActivity(studentId, 100); // wider window for a full-history view

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
      educator: educator ? { id: educator.id, firstName: educator.firstName, lastName: educator.lastName, email: educator.email } : null,
      learningPlans, // planId, status, startDate, endDate, requireCorrectAnswersToProgress, topics[] → each with done/todo scheduledSessions (full session objects, including their ids for PATCH targeting)
      payments,
      assessments, // { stats: {...}, activity: [...] } — each activity item includes attemptNumber
    };
  }
}