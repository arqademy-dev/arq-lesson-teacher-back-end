import { eq } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { learningPlans, learningPlanTopics, payments, studentInteractionLogs } from '../../db/schema.js';
import { DailyService } from '../daily/daily.service.js';

const dailyService = new DailyService();

export class StudentDashboardService {
  async getSummary(studentId: string) {
    const currentSession = await dailyService.getCurrentSession(studentId);
    const myPlans = await db.select().from(learningPlans).where(eq(learningPlans.studentId, studentId));
    const planIds = myPlans.map((p) => p.id);

    let totalTopics = 0;
    let completedTopics = 0;
    for (const planId of planIds) {
      const planTopics = await db.select().from(learningPlanTopics).where(eq(learningPlanTopics.learningPlanId, planId));
      totalTopics += planTopics.length;
      completedTopics += planTopics.filter((t) => t.status === 'completed').length;
    }

    const flatPayments = planIds.length
      ? (await Promise.all(planIds.map((id) => db.select().from(payments).where(eq(payments.learningPlanId, id))))).flat()
      : [];

    const myLogs = await db.select().from(studentInteractionLogs).where(eq(studentInteractionLogs.studentId, studentId));
    const totalSubmissions = myLogs.length;
    const correctSubmissions = myLogs.filter((l) => l.isCorrect).length;

    return {
      currentSession,
      progress: {
        totalTopics,
        completedTopics,
        percentComplete: totalTopics ? Math.round((completedTopics / totalTopics) * 100) : 0,
      },
      payments: {
        hasPendingPayment: flatPayments.some((p) => p.status === 'pending'),
        hasSuccessfulPayment: flatPayments.some((p) => p.status === 'success'),
      },
      performance: {
        totalSubmissions,
        correctSubmissions,
        accuracyPercent: totalSubmissions ? Math.round((correctSubmissions / totalSubmissions) * 100) : 0,
        averageScore: totalSubmissions ? Math.round(myLogs.reduce((sum, l) => sum + l.scoreAwarded, 0) / totalSubmissions) : 0,
      },
    };
  }
}
