import { renderEmail, fmtNaira } from '../templates/email-layout.js';
import { paymentDetailRows, planDetailRows } from '../templates/details.js';
import type { EnrolmentData, OutgoingMail, PaymentSuccessData, PlanAssignedData } from '../types.js';

// Pure builders, same idea as student-mails.ts, but written TO a parent/guardian
// ("{student} has been enrolled…"). Kept in a separate file so each audience's
// wording can change without touching the other.

/**
 * 1. The student was added.
 * `includeCredentials` is true ONLY when this guardian's email is also the student's
 * login email (so they are the one who has to sign in). Every other guardian gets the
 * same news with no password in it.
 */
export function guardianEnrolmentMail(
  to: string,
  guardianName: string,
  d: EnrolmentData,
  includeCredentials: boolean
): OutgoingMail {
  const details = [
    { label: 'Student', value: d.studentName },
    { label: 'Student ID', value: d.arqId },
    ...(d.programmeTitle ? [{ label: 'Programme', value: d.programmeTitle }] : []),
  ];

  const { html, text } = renderEmail({
    preheader: `${d.studentName} has been enrolled at Arqademy.`,
    heading: `${d.studentName} is enrolled`,
    paragraphs: [
      `Hello ${guardianName},`,
      `${d.studentName} has been enrolled at Arqademy${d.programmeTitle ? ` in ${d.programmeTitle}` : ''}. You're listed as their parent/guardian, so we'll keep you updated on their learning plan and payments.`,
      includeCredentials
        ? `This email address is also the sign-in email for ${d.studentFirstName}'s account, so their sign-in details are below.`
        : `Next, a learning plan will be set up and we'll email you when it's ready.`,
    ],
    details,
    callout: includeCredentials
      ? {
          title: 'Sign-in details',
          lines: [
            { label: 'Email', value: d.loginEmail },
            { label: 'Student ID', value: d.arqId },
            { label: 'Password', value: d.temporaryPassword ?? 'the password you were given' },
          ],
        }
      : undefined,
    cta: includeCredentials ? { label: 'Sign in', url: d.loginUrl } : undefined,
    footnote: includeCredentials
      ? 'Keep the password private. If you were not expecting this email, you can safely ignore it.'
      : `If you weren't expecting this email, you can safely ignore it.`,
  });

  return { to, subject: `${d.studentName} has been enrolled at Arqademy`, html, text };
}

/** 2. A learning plan was assigned to their child. */
export function guardianPlanAssignedMail(to: string, guardianName: string, d: PlanAssignedData): OutgoingMail {
  const paragraphs = [`Hello ${guardianName},`, `A learning plan has been set up for ${d.studentName}.`];
  if (d.amountDueNaira != null) {
    paragraphs.push(
      `To unlock the sessions and weekly quizzes, a payment of ${fmtNaira(d.amountDueNaira)} is required. It can be completed from ${d.studentFirstName}'s Arqademy account.`
    );
  }

  const { html, text } = renderEmail({
    preheader: `${d.studentName}'s learning plan is ready.`,
    heading: `${d.studentFirstName}'s learning plan is ready`,
    paragraphs,
    details: planDetailRows(d),
    cta: { label: 'View learning plan', url: d.planUrl },
  });

  return { to, subject: `${d.studentName}'s Arqademy learning plan is ready`, html, text };
}

/** 3. Payment succeeded for their child's plan. Doubles as a receipt. */
export function guardianPaymentSuccessMail(to: string, guardianName: string, d: PaymentSuccessData): OutgoingMail {
  const { html, text } = renderEmail({
    preheader: `Payment of ${fmtNaira(d.amountNaira)} received for ${d.studentName}.`,
    heading: 'Payment received',
    paragraphs: [
      `Hello ${guardianName},`,
      `We've received payment of ${fmtNaira(d.amountNaira)} for ${d.studentName}'s learning plan. Their sessions and weekly quizzes are now unlocked.`,
    ],
    details: paymentDetailRows(d),
    cta: { label: 'View learning plan', url: d.planUrl },
    footnote: 'Keep this email as your receipt.',
  });

  return { to, subject: `Payment received for ${d.studentName}`, html, text };
}