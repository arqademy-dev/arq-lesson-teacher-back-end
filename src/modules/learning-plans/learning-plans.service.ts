import { eq } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { learningPlans, learningPlanTopics, scheduledSessions, topics } from '../../db/schema.js';
import { getNextSessionDates } from '../../utils/scheduling.js';

export class LearningPlanService {
  async createPlan(
    educatorId: string,
    data: {
      studentId: string;
      sessionsPerWeek: number;
      preferredDays: string[];
      startDate: string;
      topics: { topicId: string; customDurationDays?: number }[];
    }
  ) {
    const [plan] = await db
      .insert(learningPlans)
      .values({
        studentId: data.studentId,
        educatorId,
        sessionsPerWeek: data.sessionsPerWeek,
        preferredDays: data.preferredDays,
        startDate: data.startDate,
        status: 'active',
      })
      .returning();

    const topicRows = data.topics.map((t, idx) => ({
      learningPlanId: plan.id,
      topicId: t.topicId,
      sequenceOrder: idx + 1,
      customDurationDays: t.customDurationDays ?? null,
      status: 'pending' as const,
    }));

    const insertedTopics = await db.insert(learningPlanTopics).values(topicRows).returning();

    await this.generateSchedule(plan, insertedTopics);

    return plan;
  }

  private async generateSchedule(
    plan: { id: string; startDate: string; preferredDays: string[] },
    planTopics: { id: string; topicId: string; customDurationDays: number | null }[]
  ) {
    let cursor = new Date(plan.startDate);
    const sessionsToInsert: any[] = [];

    for (const lpt of planTopics) {
      const [topic] = await db.select().from(topics).where(eq(topics.id, lpt.topicId)).limit(1);
      if (!topic) continue;

      const durationDays = lpt.customDurationDays ?? topic.expectedDurationDays;
      const dates = getNextSessionDates(cursor, plan.preferredDays, durationDays);

      dates.forEach((date, idx) => {
        sessionsToInsert.push({
          learningPlanTopicId: lpt.id,
          scheduledDate: date.toISOString().split('T')[0],
          sessionDayNumber: idx + 1,
          isCompleted: false,
        });
      });

      // Next topic starts the day after this topic's last generated session
      cursor = new Date(dates[dates.length - 1]);
      cursor.setDate(cursor.getDate() + 1);
    }

    if (sessionsToInsert.length > 0) {
      await db.insert(scheduledSessions).values(sessionsToInsert);
    }
  }

  async getPlanWithSchedule(planId: string) {
    const [plan] = await db.select().from(learningPlans).where(eq(learningPlans.id, planId)).limit(1);
    if (!plan) return null;

    const planTopics = await db
      .select()
      .from(learningPlanTopics)
      .where(eq(learningPlanTopics.learningPlanId, planId))
      .orderBy(learningPlanTopics.sequenceOrder);

    const topicsWithSessions = await Promise.all(
      planTopics.map(async (lpt) => {
        const [topic] = await db.select().from(topics).where(eq(topics.id, lpt.topicId)).limit(1);
        const sessions = await db
          .select()
          .from(scheduledSessions)
          .where(eq(scheduledSessions.learningPlanTopicId, lpt.id))
          .orderBy(scheduledSessions.sessionDayNumber);
        return { ...lpt, topic, sessions };
      })
    );

    return { ...plan, topics: topicsWithSessions };
  }

  async getPlanRaw(planId: string) {
    const [plan] = await db.select().from(learningPlans).where(eq(learningPlans.id, planId)).limit(1);
    return plan || null;
  }

  async listPlansForStudent(studentId: string) {
    return db.select().from(learningPlans).where(eq(learningPlans.studentId, studentId));
  }
}