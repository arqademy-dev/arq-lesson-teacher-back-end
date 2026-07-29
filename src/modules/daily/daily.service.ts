import { eq, and, asc } from 'drizzle-orm';
import { db } from '../../config/db.js';
import {
  learningPlans, learningPlanTopics, scheduledSessions,
  topics, resources, interactiveElements, studentInteractionLogs,
} from '../../db/schema.js';
import { PaymentService } from '../payments/payments.service.js';

const paymentService = new PaymentService();

export class DailyService {
  async getCurrentSession(studentId: string) {
    const plans = await db.select().from(learningPlans).where(and(eq(learningPlans.studentId, studentId), eq(learningPlans.status, 'active')));

    for (const plan of plans) {
      const paid = await paymentService.hasSuccessfulPayment(plan.id);
      if (!paid) continue; // skip unpaid plans entirely — no content leaks through

      const planTopics = await db
        .select()
        .from(learningPlanTopics)
        .where(eq(learningPlanTopics.learningPlanId, plan.id))
        .orderBy(asc(learningPlanTopics.sequenceOrder));

      for (const lpt of planTopics) {
        const [session] = await db
          .select()
          .from(scheduledSessions)
          .where(and(eq(scheduledSessions.learningPlanTopicId, lpt.id), eq(scheduledSessions.isCompleted, false)))
          .orderBy(asc(scheduledSessions.sessionDayNumber))
          .limit(1);

        if (session) {
          const [topic] = await db.select().from(topics).where(eq(topics.id, lpt.topicId)).limit(1);
          const dayResources = await db
            .select()
            .from(resources)
            .where(and(eq(resources.topicId, lpt.topicId), eq(resources.dayNumber, session.sessionDayNumber)))
            .orderBy(asc(resources.sortOrder));

          const resourcesWithElements = await Promise.all(
            dayResources.map(async (resource) => {
              const elements = await db.select().from(interactiveElements).where(eq(interactiveElements.resourceId, resource.id));
              return {
                ...resource,
                interactiveElements: elements.map(({ correctAnswers, ...safe }) => safe), // never leak answers
              };
            })
          );

          const isOverdue = new Date(session.scheduledDate) < new Date(new Date().toDateString());

          return {
            session,
            isOverdue,
            topic,
            learningPlanId: plan.id,
            resources: resourcesWithElements,
          };
        }
      }
    }

    return null; // no active, paid, incomplete session found
  }

  async completeSession(studentId: string, sessionId: string) {
    // Verify this session belongs to the student and is genuinely the current (earliest incomplete) one
    const current = await this.getCurrentSession(studentId);
    if (!current || current.session.id !== sessionId) {
      throw new Error('This is not your current active session, or it is already completed');
    }

    const [updated] = await db
      .update(scheduledSessions)
      .set({ isCompleted: true })
      .where(eq(scheduledSessions.id, sessionId))
      .returning();

    return updated;
  }

  async submitInteraction(
    studentId: string,
    data: { interactiveElementId: string; scheduledSessionId: string; response: Record<string, any> }
  ) {
    const [element] = await db.select().from(interactiveElements).where(eq(interactiveElements.id, data.interactiveElementId)).limit(1);
    if (!element) throw new Error('Interactive element not found');

    const isCorrect = JSON.stringify(data.response) === JSON.stringify(element.correctAnswers);
    const scoreAwarded = isCorrect ? 10 : 0; // flat scoring for now — can be made configurable per element later

    const [log] = await db
      .insert(studentInteractionLogs)
      .values({
        studentId,
        interactiveElementId: data.interactiveElementId,
        scheduledSessionId: data.scheduledSessionId,
        studentResponse: data.response,
        isCorrect,
        scoreAwarded,
      })
      .returning();

    return { isCorrect, scoreAwarded, log };
  }
}