import { renderEmail, fmtNaira } from '../templates/email-layout.js';
import { paymentDetailRows, planDetailRows } from '../templates/details.js';
import type { EnrolmentData, OutgoingMail, PaymentSuccessData, PlanAssignedData } from '../types.js';

// These are PURE builders: data in, { to, subject, html, text } out. Nothing here
// touches the database or sends anything — resend-mails.service.ts does that.
// Everything in this file is written TO the student ("you", "your").

/** 1. Student was added. The only mail that carries sign-in details. */
export function studentWelcomeMail(to: string, d: EnrolmentData): OutgoingMail {
  const { html, text } = renderEmail({
    preheader: `Your Arqademy account is ready, ${d.studentFirstName}.`,
    heading: `Welcome to Arqademy, ${d.studentFirstName}!`,
    paragraphs: [
      d.programmeTitle
        ? `You've been enrolled in ${d.programmeTitle}. Here is everything you need to sign in.`
        : `Your student account has been created. Here is everything you need to sign in.`,
      `Next, your learning plan will be set up. We'll email you again as soon as it's ready.`,
    ],
    callout: {
      title: 'Your sign-in details',
      lines: [
        { label: 'Email', value: d.loginEmail },
        { label: 'Student ID', value: d.arqId },
        { label: 'Password', value: d.temporaryPassword ?? 'the password you were given' },
      ],
    },
    cta: { label: 'Sign in', url: d.loginUrl },
    footnote: `Keep your password private. If you weren't expecting this email, you can safely ignore it.`,
  });

  return { to, subject: 'Welcome to Arqademy — your account is ready', html, text };
}

/** 2. A learning plan was assigned to the student. */
export function studentPlanAssignedMail(to: string, d: PlanAssignedData): OutgoingMail {
  const paragraphs = [`Your learning plan has been set up, ${d.studentFirstName}. Here's what's ahead:`];
  if (d.amountDueNaira != null) {
    paragraphs.push(
      `To unlock your sessions and weekly quizzes, a payment of ${fmtNaira(d.amountDueNaira)} is needed. You can complete it from your learning plan page.`
    );
  }

  const { html, text } = renderEmail({
    preheader: d.programmeTitle ? `Your ${d.programmeTitle} plan is ready.` : 'Your learning plan is ready.',
    heading: 'Your learning plan is ready',
    paragraphs,
    details: planDetailRows(d),
    cta: { label: d.amountDueNaira != null ? 'View plan & pay' : 'Open my learning plan', url: d.planUrl },
  });

  return { to, subject: 'Your Arqademy learning plan is ready', html, text };
}

/** 3. Payment succeeded — the plan is unlocked. */
export function studentPaymentSuccessMail(to: string, d: PaymentSuccessData): OutgoingMail {
  const { html, text } = renderEmail({
    preheader: `We've received your payment of ${fmtNaira(d.amountNaira)}.`,
    heading: `Payment received — you're all set, ${d.studentFirstName}!`,
    paragraphs: [
      `Thank you! Your payment has been confirmed and your learning plan is now unlocked, including your daily sessions and weekly quizzes.`,
    ],
    details: paymentDetailRows(d),
    cta: { label: 'Start learning', url: d.planUrl },
    footnote: 'Keep this email as your receipt.',
  });

  return { to, subject: 'Payment received — your learning plan is unlocked', html, text };
}