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
      const current = await this.getCurrentSession(studentId);
      if (!current || current.session.id !== sessionId) {
        throw new Error('This is not your current active session, or it is already completed');
      }

      const [plan] = await db.select().from(learningPlans).where(eq(learningPlans.id, current.learningPlanId)).limit(1);
      const requireCorrect = plan?.requireCorrectAnswersToProgress ?? true;

      if (requireCorrect) {
        const allElementIds = current.resources.flatMap((r) => r.interactiveElements.map((ie: any) => ie.id));
        if (allElementIds.length > 0) {
          const logs = await db.select().from(studentInteractionLogs).where(eq(studentInteractionLogs.scheduledSessionId, sessionId));
          const correctIds = new Set(logs.filter((l) => l.isCorrect).map((l) => l.interactiveElementId));
          const missing = allElementIds.filter((id) => !correctIds.has(id));
          if (missing.length > 0) {
            throw new Error(`Cannot advance yet — ${missing.length} interactive element(s) still need a correct answer.`);
          }
        }
      }

      const [updated] = await db.update(scheduledSessions).set({ isCompleted: true }).where(eq(scheduledSessions.id, sessionId)).returning();
      return updated;
    }

  async submitInteraction(
    studentId: string,
    data: { interactiveElementId: string; scheduledSessionId: string; response: Record<string, any> }
  ) {
    const [element] = await db.select().from(interactiveElements).where(eq(interactiveElements.id, data.interactiveElementId)).limit(1);
    if (!element) throw new Error('Interactive element not found');

    const priorAttempts = await db
      .select()
      .from(studentInteractionLogs)
      .where(
        and(
          eq(studentInteractionLogs.studentId, studentId),
          eq(studentInteractionLogs.interactiveElementId, data.interactiveElementId),
          eq(studentInteractionLogs.scheduledSessionId, data.scheduledSessionId)
        )
      );
    const attemptNumber = priorAttempts.length + 1;

    const isCorrect = JSON.stringify(data.response) === JSON.stringify(element.correctAnswers);
    const scoreAwarded = isCorrect ? 10 : 0;

    const [log] = await db
      .insert(studentInteractionLogs)
      .values({
        studentId,
        interactiveElementId: data.interactiveElementId,
        scheduledSessionId: data.scheduledSessionId,
        studentResponse: data.response,
        isCorrect,
        scoreAwarded,
        attemptNumber,
      })
      .returning();

    return { isCorrect, scoreAwarded, attemptNumber, log };
  }
}