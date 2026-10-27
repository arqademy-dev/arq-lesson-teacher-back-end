import { desc, eq, sql } from 'drizzle-orm';
import { db } from '../../config/db.js';
import {
  guardians,
  learningPlanTopics,
  learningPlans,
  payments,
  programmes,
  students,
  users,
} from '../../db/schema.js';
import { sendMails } from './resend.client.js';
import { studentPaymentSuccessMail, studentPlanAssignedMail, studentWelcomeMail } from './student/student-mails.js';
import {
  guardianEnrolmentMail,
  guardianPaymentSuccessMail,
  guardianPlanAssignedMail,
} from './guardian/guardian-mails.js';

import type {
  EnrolmentData,
  GuardianTarget,
  OutgoingMail,
  PaymentSuccessData,
  PlanAssignedData,
} from './types.js';

// ------------------------------------------------------------------
// Public API — three functions, each safe to call WITHOUT await:
//     void notifyStudentEnrolled(...)
// They never throw and never block the request that triggered them.
// ------------------------------------------------------------------

/** Student was added (by an admin OR an educator). */
export function notifyStudentEnrolled(studentId: string, opts: { temporaryPassword?: string | null } = {}) {
  return safe('student enrolled', async () => {
    const ctx = await loadStudentContext(studentId);
    if (!ctx) return;

    const data: EnrolmentData = {
      studentName: ctx.fullName,
      studentFirstName: ctx.firstName,
      arqId: ctx.arqId,
      loginEmail: ctx.email,
      programmeTitle: ctx.programmeTitle,
      temporaryPassword: opts.temporaryPassword ?? null,
      loginUrl: `${clientUrl()}/students/login`,
    };

    await sendMails(
      compose(
        ctx,
        (to) => studentWelcomeMail(to, data),
        (g, isLoginHolder) => guardianEnrolmentMail(g.email, g.name, data, isLoginHolder)
      )
    );
  });
}

/** A learning plan was assigned (works for programme plans and old class plans). */
export function notifyPlanAssigned(planId: string) {
  return safe('plan assigned', async () => {
    const [plan] = await db.select().from(learningPlans).where(eq(learningPlans.id, planId)).limit(1);
    if (!plan) return;

    const ctx = await loadStudentContext(plan.studentId);
    if (!ctx) return;

    const [programme] = plan.programmeId
      ? await db.select({ title: programmes.title }).from(programmes).where(eq(programmes.id, plan.programmeId)).limit(1)
      : [];

    const [{ topicCount }] = await db
      .select({ topicCount: sql<number>`count(*)::int` })
      .from(learningPlanTopics)
      .where(eq(learningPlanTopics.learningPlanId, planId));

    const [latestPayment] = await db
      .select({ amountNaira: payments.amountNaira, status: payments.status })
      .from(payments)
      .where(eq(payments.learningPlanId, planId))
      .orderBy(desc(payments.createdAt))
      .limit(1);

    const data: PlanAssignedData = {
      studentName: ctx.fullName,
      studentFirstName: ctx.firstName,
      programmeTitle: programme?.title ?? ctx.programmeTitle,
      startDate: plan.startDate,
      endDate: plan.endDate,
      weeks: plan.weeks,
      topicCount,
      quizDay: plan.quizDay,
      quizSize: plan.quizSize,
      quizDurationMinutes: plan.quizDurationMinutes ?? null,
      amountDueNaira: latestPayment && latestPayment.status !== 'success' ? latestPayment.amountNaira : null,
      planUrl: `${clientUrl()}/students/learning-plan`,
    };

    await sendMails(
      compose(
        ctx,
        (to) => studentPlanAssignedMail(to, data),
        (g) => guardianPlanAssignedMail(g.email, g.name, data)
      )
    );
  });
}

/**
 * A payment just became successful. Call it ONLY at the moment the status changes to
 * 'success' (manual admin approval, GafiaPay webhook) — not on every read — or people
 * get duplicate receipts. It re-checks the status itself as a safety net.
 */
export function notifyPaymentSuccess(paymentId: string) {
  return safe('payment success', async () => {
    const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
    if (!payment || payment.status !== 'success') return;

    const ctx = await loadStudentContext(payment.studentId);
    if (!ctx) return;

    const [plan] = await db
      .select({ programmeId: learningPlans.programmeId, startDate: learningPlans.startDate })
      .from(learningPlans)
      .where(eq(learningPlans.id, payment.learningPlanId))
      .limit(1);

    const [programme] = plan?.programmeId
      ? await db.select({ title: programmes.title }).from(programmes).where(eq(programmes.id, plan.programmeId)).limit(1)
      : [];

    const data: PaymentSuccessData = {
      studentName: ctx.fullName,
      studentFirstName: ctx.firstName,
      programmeTitle: programme?.title ?? ctx.programmeTitle,
      amountNaira: payment.amountNaira,
      paidAt: payment.paidAt ?? new Date(),
      reference: payment.providerReference ?? payment.gafiaAccountNumber ?? payment.id.slice(0, 8).toUpperCase(),
      startDate: plan?.startDate ?? null,
      planUrl: `${clientUrl()}/students/learning-plan`,
    };

    await sendMails(
      compose(
        ctx,
        (to) => studentPaymentSuccessMail(to, data),
        (g) => guardianPaymentSuccessMail(g.email, g.name, data)
      )
    );
  });
}

// ------------------------------------------------------------------
// Internals
// ------------------------------------------------------------------

async function safe(label: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (err) {
    console.error(`[resend-mails] ${label} failed:`, err);
  }
}

function clientUrl() {
  return (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
}

async function loadStudentContext(studentId: string) {
  const [row] = await db
    .select({
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email, // the student's LOGIN email (their own, or a parent's)
      arqId: users.arqId,
      programmeTitle: programmes.title,
    })
    .from(students)
    .innerJoin(users, eq(students.userId, users.id))
    .leftJoin(programmes, eq(students.programId, programmes.id))
    .where(eq(students.id, studentId))
    .limit(1);
  if (!row) return null;

  const guardianRows = await db
    .select({ fullName: guardians.fullName, email: guardians.email })
    .from(guardians)
    .where(eq(guardians.studentId, studentId))
    .orderBy(desc(guardians.isPrimary));

  return { ...row, fullName: `${row.firstName} ${row.lastName}`.trim(), guardians: guardianRows };
}

type Ctx = NonNullable<Awaited<ReturnType<typeof loadStudentContext>>>;

// Guardians that actually have an email, de-duplicated (case-insensitive).
function guardianTargets(ctx: Ctx): GuardianTarget[] {
  const seen = new Set<string>();
  const out: GuardianTarget[] = [];
  for (const g of ctx.guardians) {
    const email = g.email?.trim();
    if (!email || seen.has(email.toLowerCase())) continue;
    seen.add(email.toLowerCase());
    out.push({ name: g.fullName, email });
  }
  return out;
}

/**
 * Decides who receives what:
 *  - Normal case: the student's login email gets the student version; every guardian
 *    with an email gets the guardian version.
 *  - Shared inbox: if a guardian's email IS the login email, that one address gets a
 *    single guardian-version mail (flagged isLoginHolder = true, which is the only
 *    time sign-in details are included) — never two copies of the same news.
 */
function compose(
  ctx: Ctx,
  studentMail: (to: string) => OutgoingMail,
  guardianMail: (g: GuardianTarget, isLoginHolder: boolean) => OutgoingMail
): OutgoingMail[] {
  const loginEmail = ctx.email.trim();
  const targets = guardianTargets(ctx);
  const sharedWithLogin = targets.find((g) => g.email.toLowerCase() === loginEmail.toLowerCase());

  const mails: OutgoingMail[] = [];
  mails.push(sharedWithLogin ? guardianMail(sharedWithLogin, true) : studentMail(loginEmail));
  for (const g of targets) {
    if (g !== sharedWithLogin) mails.push(guardianMail(g, false));
  }
  return mails;
}