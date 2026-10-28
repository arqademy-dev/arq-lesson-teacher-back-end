import { and, desc, eq, gt, isNull, sql } from 'drizzle-orm';
import { createHash, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import bcrypt from 'bcrypt';
import { db } from '../../config/db.js';
import { passwordResets, users } from '../../db/schema.js';
import { sendPasswordOtp, sendPasswordResetLink } from '../resend-mails/index.js';

const LINK_TTL_MIN = 30;
const OTP_TTL_MIN = 10;
const COOLDOWN_MS = 60_000; // one email per minute per purpose
const MAX_OTP_ATTEMPTS = 5;

export class PasswordResetError extends Error {
  status: 400 | 404 | 429 | 502;
  constructor(message: string, status: 400 | 404 | 429 | 502) {
    super(message);
    this.status = status;
  }
}

const sha = (v: string) => createHash('sha256').update(v).digest('hex');
const inMinutes = (n: number) => new Date(Date.now() + n * 60_000);
const clientUrl = () => (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');

function maskEmail(email: string) {
  const [name, domain] = email.split('@');
  return `${name.slice(0, 2)}${'*'.repeat(Math.max(name.length - 2, 1))}@${domain}`;
}

type Purpose = 'link' | 'otp';

export class StudentPasswordService {
  // ------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------
  private async invalidate(userId: string, purpose: Purpose) {
    await db
      .update(passwordResets)
      .set({ usedAt: new Date() })
      .where(and(eq(passwordResets.userId, userId), eq(passwordResets.purpose, purpose), isNull(passwordResets.usedAt)));
  }

  private async onCooldown(userId: string, purpose: Purpose) {
    const [last] = await db
      .select({ createdAt: passwordResets.createdAt })
      .from(passwordResets)
      .where(and(eq(passwordResets.userId, userId), eq(passwordResets.purpose, purpose)))
      .orderBy(desc(passwordResets.createdAt))
      .limit(1);
    return !!last && Date.now() - last.createdAt.getTime() < COOLDOWN_MS;
  }

  // Sets the password and burns every outstanding link/code for that user.
  private async setPassword(userId: string, password: string) {
    const hashed = await bcrypt.hash(password, 10);
    await db.update(users).set({ password: hashed }).where(eq(users.id, userId));
    await db
      .update(passwordResets)
      .set({ usedAt: new Date() })
      .where(and(eq(passwordResets.userId, userId), isNull(passwordResets.usedAt)));
  }

  // ------------------------------------------------------------
  // 1. Forgot password (login page) — emailed link
  // ------------------------------------------------------------

  // Never reveals whether the email exists: returns nothing either way.
  async requestLink(email: string) {
    const [user] = await db
      .select({ id: users.id, email: users.email, firstName: users.firstName })
      .from(users)
      .where(
        and(
          sql`lower(${users.email}) = ${email.trim().toLowerCase()}`,
          eq(users.role, 'student'),
          eq(users.active, true)
        )
      )
      .limit(1);
    if (!user) return;
    if (await this.onCooldown(user.id, 'link')) return;

    await this.invalidate(user.id, 'link');
    const raw = randomBytes(32).toString('hex');
    await db.insert(passwordResets).values({
      userId: user.id,
      purpose: 'link',
      tokenHash: sha(raw),
      expiresAt: inMinutes(LINK_TTL_MIN),
    });

    // Not awaited on purpose: response time must not reveal whether the email exists.
    void sendPasswordResetLink(user.email, {
      studentFirstName: user.firstName,
      resetUrl: `${clientUrl()}/students/reset-password?token=${raw}`,
      expiresInMinutes: LINK_TTL_MIN,
    });
  }

  private async findLink(token: string) {
    const [row] = await db
      .select({ id: passwordResets.id, userId: passwordResets.userId, email: users.email })
      .from(passwordResets)
      .innerJoin(users, eq(passwordResets.userId, users.id))
      .where(
        and(
          eq(passwordResets.tokenHash, sha(token)),
          eq(passwordResets.purpose, 'link'),
          isNull(passwordResets.usedAt),
          gt(passwordResets.expiresAt, new Date())
        )
      )
      .limit(1);
    if (!row) {
      throw new PasswordResetError('This reset link is invalid or has expired. Please request a new one.', 400);
    }
    return row;
  }

  // Lets the reset page show the (locked) email.
  async verifyLink(token: string) {
    const row = await this.findLink(token);
    return { email: row.email };
  }

  async resetWithLink(token: string, password: string) {
    const row = await this.findLink(token);
    await this.setPassword(row.userId, password);
  }

  // ------------------------------------------------------------
  // 2. Change password (profile page) — emailed 6-digit code
  // ------------------------------------------------------------
  async sendOtp(userId: string) {
    const [user] = await db
      .select({ email: users.email, firstName: users.firstName })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) throw new PasswordResetError('User not found', 404);

    if (await this.onCooldown(userId, 'otp')) {
      throw new PasswordResetError('Please wait a minute before requesting another code.', 429);
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.invalidate(userId, 'otp');
    await db.insert(passwordResets).values({
      userId,
      purpose: 'otp',
      tokenHash: sha(`${userId}:${code}`),
      expiresAt: inMinutes(OTP_TTL_MIN),
    });

    const sent = await sendPasswordOtp(user.email, {
      studentFirstName: user.firstName,
      code,
      expiresInMinutes: OTP_TTL_MIN,
    });
    if (!sent) throw new PasswordResetError('We could not send the email. Please try again.', 502);

    return { sentTo: maskEmail(user.email), expiresInMinutes: OTP_TTL_MIN };
  }

  async confirmOtp(userId: string, otp: string, password: string) {
    const [row] = await db
      .select()
      .from(passwordResets)
      .where(
        and(
          eq(passwordResets.userId, userId),
          eq(passwordResets.purpose, 'otp'),
          isNull(passwordResets.usedAt),
          gt(passwordResets.expiresAt, new Date())
        )
      )
      .orderBy(desc(passwordResets.createdAt))
      .limit(1);
    if (!row) throw new PasswordResetError('That code has expired. Please request a new one.', 400);

    if (row.attempts >= MAX_OTP_ATTEMPTS) {
      await db.update(passwordResets).set({ usedAt: new Date() }).where(eq(passwordResets.id, row.id));
      throw new PasswordResetError('Too many wrong attempts. Please request a new code.', 400);
    }

    const given = Buffer.from(sha(`${userId}:${otp}`));
    const stored = Buffer.from(row.tokenHash);
    if (given.length !== stored.length || !timingSafeEqual(given, stored)) {
      await db
        .update(passwordResets)
        .set({ attempts: sql`${passwordResets.attempts} + 1` })
        .where(eq(passwordResets.id, row.id));
      throw new PasswordResetError('Incorrect code. Please check and try again.', 400);
    }

    await this.setPassword(userId, password);
  }
}