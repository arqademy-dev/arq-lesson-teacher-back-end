import { eq } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { users, educators } from '../../db/schema.js';
import bcrypt from 'bcrypt';

export class UserService {
  private generateArqId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'ARQ';
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async findUserByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user || null;
  }

  async findEducatorProfileByUserId(userId: number) {
    const [profile] = await db.select().from(educators).where(eq(educators.userId, userId)).limit(1);
    return profile || null;
  }

  async registerEducator(data: { email: string; password: string; firstName: string; lastName: string }) {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(data.password, saltRounds);
    const arqId = this.generateArqId();

    const [newUser] = await db.insert(users).values({
      email: data.email,
      password: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
      role: 'educator',
      arqId,
      verified: false,
      active: true,
    }).returning();

    await db.insert(educators).values({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      arqId,
      accountApproval: 'pending',
      userId: newUser.id,
    });

    return newUser;
  }
}