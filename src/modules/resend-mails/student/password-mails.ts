// Save as: resend-mails/student/password-mails.ts
import { renderEmail } from '../templates/email-layout.js';
import type { OutgoingMail, PasswordOtpData, PasswordResetLinkData } from '../types.js';

/** Forgot-password link (from the login page). */
export function studentPasswordResetLinkMail(to: string, d: PasswordResetLinkData): OutgoingMail {
  const { html, text } = renderEmail({
    preheader: 'Reset your Arqademy password.',
    heading: 'Reset your password',
    paragraphs: [
      `Hello ${d.studentFirstName},`,
      `We received a request to reset the password for your Arqademy student account. Click the button below to choose a new one. The link works for ${d.expiresInMinutes} minutes and can only be used once.`,
    ],
    cta: { label: 'Reset password', url: d.resetUrl },
    footnote: `If you didn't ask for this, you can safely ignore this email. Your password won't change.`,
  });
  return { to, subject: 'Reset your Arqademy password', html, text };
}

/** 6-digit code (from the profile page). */
export function studentPasswordOtpMail(to: string, d: PasswordOtpData): OutgoingMail {
  const { html, text } = renderEmail({
    preheader: `Your Arqademy verification code is ${d.code}.`,
    heading: 'Your verification code',
    paragraphs: [
      `Hello ${d.studentFirstName},`,
      `Use this code to change your password. It expires in ${d.expiresInMinutes} minutes.`,
    ],
    code: d.code,
    footnote: `Never share this code with anyone. If you didn't request it, ignore this email.`,
  });
  return { to, subject: `${d.code} is your Arqademy verification code`, html, text };
}