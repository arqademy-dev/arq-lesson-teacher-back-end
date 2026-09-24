import { and, desc, eq } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { programmePrices, programmes } from '../../db/schema.js';
import type { CreateProgrammePriceBody, UpdateProgrammePriceBody } from './programme-prices.validation.js';

export class ProgrammePriceError extends Error {
  status: 400 | 404;
  constructor(message: string, status: 400 | 404) {
    super(message);
    this.status = status;
  }
}

export class ProgrammePriceService {
  async list(programmeId: string) {
    return db
      .select()
      .from(programmePrices)
      .where(eq(programmePrices.programmeId, programmeId))
      .orderBy(desc(programmePrices.createdAt));
  }

  async getActive(programmeId: string) {
    const [row] = await db
      .select()
      .from(programmePrices)
      .where(and(eq(programmePrices.programmeId, programmeId), eq(programmePrices.isActive, true)))
      .orderBy(desc(programmePrices.createdAt))
      .limit(1);
    return row || null;
  }

  // Setting a new price active deactivates whichever one was active before it —
  // keeps "the active price" a single, unambiguous lookup for the plan generator.
  async create(data: CreateProgrammePriceBody) {
    const [programme] = await db.select({ id: programmes.id }).from(programmes).where(eq(programmes.id, data.programmeId)).limit(1);
    if (!programme) throw new ProgrammePriceError('Programme not found', 404);

    if (data.isActive) {
      await db
        .update(programmePrices)
        .set({ isActive: false })
        .where(and(eq(programmePrices.programmeId, data.programmeId), eq(programmePrices.isActive, true)));
    }

    const [row] = await db.insert(programmePrices).values(data).returning();
    return row;
  }

  async update(id: string, patch: UpdateProgrammePriceBody) {
    const [existing] = await db.select().from(programmePrices).where(eq(programmePrices.id, id)).limit(1);
    if (!existing) return null;

    if (patch.isActive === true) {
      await db
        .update(programmePrices)
        .set({ isActive: false })
        .where(and(eq(programmePrices.programmeId, existing.programmeId), eq(programmePrices.isActive, true)));
    }

    const [row] = await db.update(programmePrices).set(patch).where(eq(programmePrices.id, id)).returning();
    return row;
  }
}