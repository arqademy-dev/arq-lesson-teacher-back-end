import { and, eq, ilike, desc, sql } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { programmes } from '../../db/schema.js';
import type { ProgrammeStatus, CreateProgrammeBody, UpdateProgrammeBody } from './programmes.validation.js';

// Thrown when a request is valid but breaks a business rule -> controller answers 409.
export class ProgrammeRuleError extends Error {}

// The counts use hand-written table/column names on purpose. Drizzle drops table
// prefixes in single-table selects, which would turn "students.program_id = programmes.id"
// into "program_id = id" and silently compare the wrong columns.
const studentCount = sql<number>`(select count(*)::int from students where students.program_id = programmes.id)`;
const topicCount = sql<number>`(select count(*)::int from programme_topics where programme_topics.programme_id = programmes.id)`;

const listColumns = {
  id: programmes.id,
  title: programmes.title,
  subtitle: programmes.subtitle,
  description: programmes.description,
  status: programmes.status,
  createdAt: programmes.createdAt,
  updatedAt: programmes.updatedAt,
  studentCount,
  topicCount,
};

export class ProgrammeService {
  // ------------------------------------------------------------
  // Admin
  // ------------------------------------------------------------
  async create(data: CreateProgrammeBody) {
    const [row] = await db
      .insert(programmes)
      .values({ title: data.title, subtitle: data.subtitle, description: data.description })
      .returning({ id: programmes.id });

    return this.getById(row.id);
  }

  async list(opts: { status?: ProgrammeStatus; search?: string; limit: number; offset: number }) {
    return db
      .select(listColumns)
      .from(programmes)
      .where(
        and(
          opts.status ? eq(programmes.status, opts.status) : undefined,
          opts.search ? ilike(programmes.title, `%${opts.search}%`) : undefined
        )
      )
      .orderBy(desc(programmes.createdAt))
      .limit(opts.limit)
      .offset(opts.offset);
  }

  async getById(id: string) {
    const [row] = await db.select(listColumns).from(programmes).where(eq(programmes.id, id)).limit(1);
    return row || null;
  }

  async update(id: string, patch: UpdateProgrammeBody) {
    const existing = await this.getById(id);
    if (!existing) return null;

    // Locked = read-only. The only change allowed is unlocking it.
    if (existing.status === 'locked') {
      const touchesOtherFields = Object.keys(patch).some((k) => k !== 'status');
      if (touchesOtherFields) {
        throw new ProgrammeRuleError('Programme is locked. Change its status first to edit it.');
      }
    }

    // Publishing needs something to teach.
    if (patch.status === 'published' && existing.topicCount === 0) {
      throw new ProgrammeRuleError('Add at least one topic before publishing this programme.');
    }

    await db
      .update(programmes)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(programmes.id, id));

    return this.getById(id);
  }

  async remove(id: string) {
    const existing = await this.getById(id);
    if (!existing) return null;

    // students.program_id is ON DELETE SET NULL, so deleting a programme with students would
    // silently detach them all. Refuse instead.
    if (existing.studentCount > 0) {
      throw new ProgrammeRuleError('Programme has enrolled students. Lock it instead of deleting it.');
    }
    if (existing.topicCount > 0) {
      throw new ProgrammeRuleError('Programme still has topics. Remove them first.');
    }

    await db.delete(programmes).where(eq(programmes.id, id));
    return existing;
  }

  // ------------------------------------------------------------
  // Educator (read-only, published only)
  // ------------------------------------------------------------
  async listPublished(search?: string) {
    return db
      .select({
        id: programmes.id,
        title: programmes.title,
        subtitle: programmes.subtitle,
        description: programmes.description,
        topicCount,
      })
      .from(programmes)
      .where(
        and(
          eq(programmes.status, 'published'),
          search ? ilike(programmes.title, `%${search}%`) : undefined
        )
      )
      .orderBy(programmes.title);
  }

  async getPublished(id: string) {
    const [row] = await db
      .select({
        id: programmes.id,
        title: programmes.title,
        subtitle: programmes.subtitle,
        description: programmes.description,
        topicCount,
      })
      .from(programmes)
      .where(and(eq(programmes.id, id), eq(programmes.status, 'published')))
      .limit(1);
    return row || null;
  }
}