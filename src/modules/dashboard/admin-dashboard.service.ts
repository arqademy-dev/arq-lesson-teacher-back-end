import { eq } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { educators, students, subjects, classes, topics, resources, payments, scheduledSessions } from '../../db/schema.js';

export class AdminDashboardService {
  async getSummary() {
    const [allEducators, allStudents, allSubjects, allClasses, allTopics, allResources, allPayments] = await Promise.all([
      db.select().from(educators),
      db.select().from(students),
      db.select().from(subjects),
      db.select().from(classes),
      db.select().from(topics),
      db.select().from(resources),
      db.select().from(payments),
    ]);

    const today = new Date().toISOString().split('T')[0];
    const todaysSessions = await db.select().from(scheduledSessions).where(eq(scheduledSessions.scheduledDate, today));

    return {
      educators: {
        total: allEducators.length,
        pendingApproval: allEducators.filter((e) => e.accountApproval === 'pending').length,
        approved: allEducators.filter((e) => e.accountApproval === 'approve').length,
      },
      students: { total: allStudents.length },
      curriculum: { subjects: allSubjects.length, classes: allClasses.length, topics: allTopics.length, resources: allResources.length },
      payments: {
        totalRevenueNaira: allPayments.filter((p) => p.status === 'success').reduce((sum, p) => sum + p.amountNaira, 0),
        pending: allPayments.filter((p) => p.status === 'pending').length,
        successful: allPayments.filter((p) => p.status === 'success').length,
        failed: allPayments.filter((p) => p.status === 'failed').length,
      },
      todaysActivity: {
        totalSessionsScheduled: todaysSessions.length,
        completed: todaysSessions.filter((s) => s.isCompleted).length,
        remaining: todaysSessions.filter((s) => !s.isCompleted).length,
      },
    };
  }
}