import { eq } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { students, users, learningPlans, learningPlanTopics, scheduledSessions, studentInteractionLogs, topics, payments, interactiveElements } from '../../db/schema.js';

export class ReportsService {
  async getStudentReport(studentId: string, preFetchedStudent?: any) {
    let studentProfile = preFetchedStudent;

    // Fallback join if the student data wasn't passed down from the controller directly
    if (!studentProfile) {
      const [found] = await db
        .select({
          id: students.id,
          academicLevel: students.academicLevel,
          enrollmentDate: students.enrollmentDate,
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(students)
        .innerJoin(users, eq(students.userId, users.id))
        .where(eq(students.id, studentId))
        .limit(1);
        
      if (!found) return null;
      studentProfile = found;
    }

    const plans = await db.select().from(learningPlans).where(eq(learningPlans.studentId, studentId));

    const planDetails = await Promise.all(
      plans.map(async (plan) => {
        const planTopics = await db.select().from(learningPlanTopics).where(eq(learningPlanTopics.learningPlanId, plan.id));
        const topicsDetail = await Promise.all(
          planTopics.map(async (lpt) => {
            const [topic] = await db.select().from(topics).where(eq(topics.id, lpt.topicId)).limit(1);
            const sessions = await db.select().from(scheduledSessions).where(eq(scheduledSessions.learningPlanTopicId, lpt.id));
            return {
              topicTitle: topic?.title,
              status: lpt.status,
              totalSessions: sessions.length,
              completedSessions: sessions.filter((s) => s.isCompleted).length,
            };
          })
        );
        const [payment] = await db.select().from(payments).where(eq(payments.learningPlanId, plan.id)).limit(1);
        return { planId: plan.id, status: plan.status, startDate: plan.startDate, paymentStatus: payment?.status || 'not_initiated', topics: topicsDetail };
      })
    );

    const logs = await db.select().from(studentInteractionLogs).where(eq(studentInteractionLogs.studentId, studentId));
    const totalSubmissions = logs.length;
    const correctSubmissions = logs.filter((l) => l.isCorrect).length;

    const byType: Record<string, { total: number; correct: number }> = {};
    for (const log of logs) {
      const [element] = await db.select().from(interactiveElements).where(eq(interactiveElements.id, log.interactiveElementId)).limit(1);
      const type = element?.interactionType || 'unknown';
      byType[type] = byType[type] || { total: 0, correct: 0 };
      byType[type].total += 1;
      if (log.isCorrect) byType[type].correct += 1;
    }

    return {
      student: { 
        id: studentProfile.id, 
        firstName: studentProfile.firstName, 
        lastName: studentProfile.lastName, 
        academicLevel: studentProfile.academicLevel, 
        enrollmentDate: studentProfile.enrollmentDate 
      },
      learningPlans: planDetails,
      assessmentSummary: {
        totalSubmissions,
        correctSubmissions,
        accuracyPercent: totalSubmissions ? Math.round((correctSubmissions / totalSubmissions) * 100) : 0,
        averageScore: totalSubmissions ? Math.round(logs.reduce((sum, l) => sum + l.scoreAwarded, 0) / totalSubmissions) : 0,
        byInteractionType: byType,
      },
    };
  }
}
