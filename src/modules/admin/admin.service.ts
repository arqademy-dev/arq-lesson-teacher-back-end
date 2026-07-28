import { eq } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { users, educators } from '../../db/schema.js';

export class AdminService {
  async findAdminByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user || user.role !== 'admin') return null;
    return user;
  }

  async listEducators(status?: 'pending' | 'approve' | 'closed' | 'suspended') {
    if (status) {
      return db.select().from(educators).where(eq(educators.accountApproval, status));
    }
    return db.select().from(educators);
  }

  async setEducatorApproval(educatorId: string, approval: 'approve' | 'suspended' | 'closed') {
    const [updated] = await db
      .update(educators)
      .set({ accountApproval: approval })
      .where(eq(educators.id, educatorId))
      .returning();
    return updated || null;
  }
}