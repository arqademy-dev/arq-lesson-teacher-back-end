import { eq } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { studentInteractionLogs, interactiveElements, resources, topics, scheduledSessions } from '../../db/schema.js';

export class FileHistoryService {
  async getFileHistoryForStudent(studentId: string) {
    const logs = await db.select().from(studentInteractionLogs).where(eq(studentInteractionLogs.studentId, studentId));

    const fileLogs: typeof logs = [];
    for (const log of logs) {
      const [element] = await db.select().from(interactiveElements).where(eq(interactiveElements.id, log.interactiveElementId)).limit(1);
      if (element?.interactionType === 'file_upload') fileLogs.push(log);
    }

    const enriched = await Promise.all(
      fileLogs.map(async (log) => {
        const [element] = await db.select().from(interactiveElements).where(eq(interactiveElements.id, log.interactiveElementId)).limit(1);
        const [resource] = element ? await db.select().from(resources).where(eq(resources.id, element.resourceId)).limit(1) : [null];
        const [topic] = resource ? await db.select().from(topics).where(eq(topics.id, resource.topicId)).limit(1) : [null];
        const [session] = await db.select().from(scheduledSessions).where(eq(scheduledSessions.id, log.scheduledSessionId)).limit(1);
        return {
          id: log.id,
          response: log.studentResponse,
          attemptNumber: log.attemptNumber,
          submittedAt: log.submittedAt,
          resourceId: resource?.id ?? null,
          resourceTitle: resource?.title ?? null,
          topicId: topic?.id ?? null,
          topicTitle: topic?.title ?? null,
          sessionId: session?.id ?? null,
          sessionScheduledDate: session?.scheduledDate ?? null,
          sessionDayNumber: session?.sessionDayNumber ?? null,
        };
      })
    );

    enriched.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

    const topicMap = new Map<string, any>();
    for (const item of enriched) {
      const topicKey = item.topicId ?? 'unknown';
      if (!topicMap.has(topicKey)) {
        topicMap.set(topicKey, { topicId: item.topicId, topicTitle: item.topicTitle, sessions: new Map<string, any>() });
      }
      const topicEntry = topicMap.get(topicKey);
      const sessionKey = item.sessionId ?? 'unknown';
      if (!topicEntry.sessions.has(sessionKey)) {
        topicEntry.sessions.set(sessionKey, { sessionId: item.sessionId, scheduledDate: item.sessionScheduledDate, sessionDayNumber: item.sessionDayNumber, files: [] });
      }
      topicEntry.sessions.get(sessionKey).files.push(item);
    }

    return Array.from(topicMap.values()).map((t) => ({ topicId: t.topicId, topicTitle: t.topicTitle, sessions: Array.from(t.sessions.values()) }));
  }
}