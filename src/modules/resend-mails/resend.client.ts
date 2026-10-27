import { Resend } from 'resend';
import type { OutgoingMail } from './types.js';

// Created lazily so a missing RESEND_API_KEY (e.g. a teammate's local .env)
// never crashes the whole server at import time — emails are just skipped.
let client: Resend | null = null;

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!client) client = new Resend(key);
  return client;
}

// Until you verify your own domain in Resend, "onboarding@resend.dev" can only
// deliver to the email address that owns the Resend account. Set RESEND_FROM_EMAIL
// to something like  Arqademy <no-reply@yourdomain.com>  once the domain is verified.
function fromAddress() {
  return process.env.RESEND_FROM_EMAIL || 'Arqademy <onboarding@resend.dev>';
}

/**
 * Sends one or more emails in a SINGLE Resend API call (batch endpoint) — this keeps us
 * under Resend's per-second request limit when a student and a guardian are both emailed
 * at once. Each message is addressed to exactly one person, so recipients never see
 * each other's addresses.
 *
 * Never throws: email problems must not break enrolment, plan creation or payments.
 * Returns true if Resend accepted the batch.
 */
export async function sendMails(mails: OutgoingMail[]): Promise<boolean> {
  if (mails.length === 0) return true;

  const resend = getClient();
  if (!resend) {
    console.warn(`[resend-mails] RESEND_API_KEY is not set — skipped ${mails.length} email(s)`);
    return false;
  }

  try {
    const { error } = await resend.batch.send(
      mails.map((m) => ({
        from: fromAddress(),
        to: [m.to],
        subject: m.subject,
        html: m.html,
        text: m.text,
      }))
    );

    if (error) {
      console.error('[resend-mails] Resend rejected the batch:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[resend-mails] send failed:', err);
    return false;
  }
}