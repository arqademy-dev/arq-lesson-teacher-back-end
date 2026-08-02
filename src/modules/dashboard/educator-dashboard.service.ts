import { eq, inArray } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { students, learningPlans, learningPlanTopics, scheduledSessions, payments } from '../../db/schema.js';

export class EducatorDashboardService {
  async getSummary(educatorId: string) {
    const myStudents = await db.select().from(students).where(eq(students.educatorId, educatorId));
    const myPlans = await db.select().from(learningPlans).where(eq(learningPlans.educatorId, educatorId));
    const planIds = myPlans.map((p) => p.id);

    const myPayments = planIds.length ? await db.select().from(payments).where(inArray(payments.learningPlanId, planIds)) : [];

    const planTopicIds = planIds.length
      ? (await db.select().from(learningPlanTopics).where(inArray(learningPlanTopics.learningPlanId, planIds))).map((t) => t.id)
      : [];
    const today = new Date().toISOString().split('T')[0];
    const todaysSessions = planTopicIds.length
      ? (await db.select().from(scheduledSessions).where(inArray(scheduledSessions.learningPlanTopicId, planTopicIds))).filter(
          (s) => s.scheduledDate === today
        )
      : [];

    return {
      students: { total: myStudents.length },
      learningPlans: { total: myPlans.length, active: myPlans.filter((p) => p.status === 'active').length },
      payments: {
        pending: myPayments.filter((p) => p.status === 'pending').length,
        successful: myPayments.filter((p) => p.status === 'success').length,
        totalCollectedNaira: myPayments.filter((p) => p.status === 'success').reduce((sum, p) => sum + p.amountNaira, 0),
      },
      todaysActivity: {
        totalSessionsScheduled: todaysSessions.length,
        completed: todaysSessions.filter((s) => s.isCompleted).length,
        remaining: todaysSessions.filter((s) => !s.isCompleted).length,
      },
    };
  }
}