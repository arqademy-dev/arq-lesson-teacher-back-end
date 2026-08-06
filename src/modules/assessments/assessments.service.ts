import { eq, desc } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { studentInteractionLogs, interactiveElements, resources, topics, students, users } from '../../db/schema.js';

export class AssessmentsService {
  private async enrichLog(log: typeof studentInteractionLogs.$inferSelect) {
    const [element] = await db.select().from(interactiveElements).where(eq(interactiveElements.id, log.interactiveElementId)).limit(1);
    const [resource] = element ? await db.select().from(resources).where(eq(resources.id, element.resourceId)).limit(1) : [null];
    const [topic] = resource ? await db.select().from(topics).where(eq(topics.id, resource.topicId)).limit(1) : [null];
    return { ...log, interactionType: element?.interactionType, resourceTitle: resource?.title, topicTitle: topic?.title };
  }

  async getSystemWideActivity(limit = 50) {
    const allLogs = await db.select().from(studentInteractionLogs);
    const recentLogs = await db.select().from(studentInteractionLogs).orderBy(desc(studentInteractionLogs.submittedAt)).limit(limit);

    const enriched = await Promise.all(
      recentLogs.map(async (log) => {
        const base = await this.enrichLog(log);
        const [studentRow] = await db.select().from(students).where(eq(students.id, log.studentId)).limit(1);
        const [userRow] = studentRow ? await db.select().from(users).where(eq(users.id, studentRow.userId)).limit(1) : [null];
        return { ...base, studentName: userRow ? `${userRow.firstName} ${userRow.lastName}` : null };
      })
    );

    const total = allLogs.length;
    const correct = allLogs.filter((l) => l.isCorrect).length;

    return {
      stats: {
        totalSubmissions: total,
        correctSubmissions: correct,
        accuracyPercent: total ? Math.round((correct / total) * 100) : 0,
        averageScore: total ? Math.round(allLogs.reduce((s, l) => s + l.scoreAwarded, 0) / total) : 0,
      },
      recentActivity: enriched,
    };
  }

  async getStudentActivity(studentId: string, limit = 50) {
    const allLogs = await db.select().from(studentInteractionLogs).where(eq(studentInteractionLogs.studentId, studentId));
    const recentLogs = await db
      .select()
      .from(studentInteractionLogs)
      .where(eq(studentInteractionLogs.studentId, studentId))
      .orderBy(desc(studentInteractionLogs.submittedAt))
      .limit(limit);

    const enriched = await Promise.all(recentLogs.map((log) => this.enrichLog(log)));

    const total = allLogs.length;
    const correct = allLogs.filter((l) => l.isCorrect).length;

    return {
      stats: {
        totalSubmissions: total,
        correctSubmissions: correct,
        accuracyPercent: total ? Math.round((correct / total) * 100) : 0,
        averageScore: total ? Math.round(allLogs.reduce((s, l) => s + l.scoreAwarded, 0) / total) : 0,
      },
      activity: enriched,
    };
  }
}