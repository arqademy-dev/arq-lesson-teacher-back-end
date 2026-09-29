import { eq, and, or } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { payments, pricingTiers, learningPlanTopics, students, learningPlans } from '../../db/schema.js';
import { getPaymentProvider } from './providers/index.js';
import { ProgrammePriceService } from '../programme-prices/programme-prices.service.js';

const programmePriceService = new ProgrammePriceService();

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

  async getById(paymentId: string) {
    const [row] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
    return row || null;
  }

  // The reconciliation key GafiaPay's webhook actually sends back
  // (metadata.virtualAccountNo) — NOT the reference we generate. This mirrors
  // your proven Next.js webhook, which looked payments up by transactionId
  // (which was set to the account number at creation time), not by reference.
  async getByGafiaAccountNumber(accountNumber: string) {
    const [row] = await db.select().from(payments).where(eq(payments.gafiaAccountNumber, accountNumber)).limit(1);
    return row || null;
  }

  // Creates the invoice, or hands back a still-usable one that already exists.
  // A pending payment whose temporal account has expired unpaid is NOT
  // "already existing" from the student's point of view — they need a fresh
  // account number to transfer into, so this (re)provisions one against the
  // SAME payment row rather than creating a second row for the same plan.
  async initiatePayment(studentId: string, learningPlanId: string, email: string, name: string) {
    const existing = await this.getExistingPaymentForPlan(learningPlanId);

    if (existing?.status === 'success') {
      return { payment: existing, alreadyExisted: true };
    }

    const meta = (existing?.providerMeta as { accountName?: string; bankName?: string; expiresAt?: string } | null) ?? null;
    const stillUsable = !!(existing && existing.gafiaAccountNumber && meta?.expiresAt && new Date(meta.expiresAt) > new Date());

    if (existing && stillUsable) {
      return {
        payment: existing,
        alreadyExisted: true,
        virtualAccount: {
          accountNumber: existing.gafiaAccountNumber!,
          accountName: meta?.accountName,
          bankName: meta?.bankName,
          expiresAt: meta?.expiresAt,
        },
      };
    }

    // No payment yet, or its virtual account expired unpaid — (re)provision.
  // No payment yet, or its virtual account expired unpaid — (re)provision.
  const [plan] = await db.select({ programmeId: learningPlans.programmeId }).from(learningPlans).where(eq(learningPlans.id, learningPlanId)).limit(1);
  if (!plan?.programmeId) throw new Error('This learning plan has no programme attached');
  const price = await programmePriceService.getActive(plan.programmeId);
  if (!price) throw new Error('No active price is set for this programme');
    const provider = getPaymentProvider();
    // Our own reference — sent to GafiaPay for their records, but their
    // webhook reconciles by account number, not this value. Kept for our own
    // audit trail and so re-provisioning reuses a fresh, unique value each time.
    const reference = existing?.providerReference && !stillUsable ? `${existing.providerReference}-R${Date.now()}` : `ARQ-${learningPlanId}-${Date.now()}`;

    const initiation = await provider.initiate({ amountNaira: price.priceNaira, email, name, reference });
    const expiresAt = new Date(Date.now() + (initiation.virtualAccount?.expiresInMinutes ?? 20) * 60 * 1000).toISOString();

    const values = {
      studentId,
      learningPlanId,
      programmePriceId: price.id,
      amountNaira: price.priceNaira,
      status: 'pending' as const,
      provider: provider.name,
      providerReference: initiation.providerReference,
      gafiaAccountNumber: initiation.virtualAccount?.accountNumber ?? null,
      providerMeta: initiation.virtualAccount
        ? { accountName: initiation.virtualAccount.accountName, bankName: initiation.virtualAccount.bankName, expiresAt }
        : null,
    };

    const [payment] = existing
      ? await db.update(payments).set(values).where(eq(payments.id, existing.id)).returning()
      : await db.insert(payments).values(values).returning();

    return {
      payment,
      alreadyExisted: false,
      redirectUrl: initiation.redirectUrl,
      virtualAccount: initiation.virtualAccount ? { ...initiation.virtualAccount, expiresAt } : undefined,
    };
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