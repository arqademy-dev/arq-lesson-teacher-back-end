import { eq, and, isNull, or, lte, gte } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { payments, pricingTiers, learningPlanTopics, learningPlans, students } from '../../db/schema.js';
import { getPaymentProvider } from './providers/index.js';

export class PaymentService {
  async getStudentProfileByUserId(userId: string) {
    const [profile] = await db.select().from(students).where(eq(students.userId, userId)).limit(1);
    return profile || null;
  }

  async countTopicsInPlan(learningPlanId: string) {
    const rows = await db.select().from(learningPlanTopics).where(eq(learningPlanTopics.learningPlanId, learningPlanId));
    return rows.length;
  }

  async findTierForTopicCount(count: number) {
    const tiers = await db.select().from(pricingTiers).where(eq(pricingTiers.isActive, true));
    return tiers.find((t) => count >= t.minTopics && (t.maxTopics === null || count <= t.maxTopics)) || null;
  }

  async getExistingPaymentForPlan(learningPlanId: string) {
    const [existing] = await db
      .select()
      .from(payments)
      .where(and(eq(payments.learningPlanId, learningPlanId), or(eq(payments.status, 'pending'), eq(payments.status, 'success'))))
      .limit(1);
    return existing || null;
  }

  async initiatePayment(studentId: string, learningPlanId: string, email: string) {
    const existing = await this.getExistingPaymentForPlan(learningPlanId);
    if (existing) return { payment: existing, alreadyExisted: true };

    const topicCount = await this.countTopicsInPlan(learningPlanId);
    const tier = await this.findTierForTopicCount(topicCount);
    if (!tier) throw new Error('No pricing tier matches this plan\'s topic count');

    const provider = getPaymentProvider();
    const initiation = await provider.initiate({
      amountNaira: tier.priceNaira,
      email,
      metadata: { studentId, learningPlanId },
    });

    const [payment] = await db
      .insert(payments)
      .values({
        studentId,
        learningPlanId,
        pricingTierId: tier.id,
        amountNaira: tier.priceNaira,
        status: 'pending',
        provider: provider.name,
        providerReference: initiation.providerReference,
      })
      .returning();

    return { payment, alreadyExisted: false, redirectUrl: initiation.redirectUrl };
  }

  async hasSuccessfulPayment(learningPlanId: string) {
    const [payment] = await db
      .select()
      .from(payments)
      .where(and(eq(payments.learningPlanId, learningPlanId), eq(payments.status, 'success')))
      .limit(1);
    return !!payment;
  }

  async listPayments(status?: 'pending' | 'success' | 'failed' | 'refunded') {
    if (status) return db.select().from(payments).where(eq(payments.status, status));
    return db.select().from(payments);
  }

  async approvePayment(id: string) {
    const [updated] = await db
      .update(payments)
      .set({ status: 'success', paidAt: new Date() })
      .where(eq(payments.id, id))
      .returning();
    return updated || null;
  }

  async rejectPayment(id: string) {
    const [updated] = await db.update(payments).set({ status: 'failed' }).where(eq(payments.id, id)).returning();
    return updated || null;
  }

  async listPaymentsForStudent(studentId: string) {
    return db.select().from(payments).where(eq(payments.studentId, studentId));
  }
}