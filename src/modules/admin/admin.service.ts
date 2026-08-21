import { eq } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { users, educators, students, classes } from '../../db/schema.js';


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

  async getEducatorProfile(educatorId: string) {
    const [educator] = await db.select().from(educators).where(eq(educators.id, educatorId)).limit(1);
    if (!educator) return null;

    const [userRow] = await db.select().from(users).where(eq(users.id, educator.userId)).limit(1);
    
    const myStudents = await db.select().from(students).where(eq(students.educatorId, educatorId));
    const [classRow] = myStudents[0]?.classId ? await db.select().from(classes).where(eq(classes.id, myStudents[0].classId)).limit(1) : [];
    const studentProfiles = await Promise.all(
      myStudents.map(async (s) => {
        const [u] = await db.select().from(users).where(eq(users.id, s.userId)).limit(1);
        return {
          id: s.id,
          firstName: u?.firstName,
          lastName: u?.lastName,
          email: u?.email,
          arqId: u?.arqId,
          academicLevel: s.academicLevel,
          enrollmentDate: s.enrollmentDate,
        };
      })
    );

    return {
      educator,
      accountStatus: userRow ? { active: userRow.active, verified: userRow.verified } : null,
      students: studentProfiles,
      totalStudents: studentProfiles.length,
    };
  }

}