import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { programmes, programmeTopics, subjects, topics } from '../../db/schema.js';
import type { SummaryFormat } from '../../shared/summary-format.js';

export class ProgrammeTopicError extends Error {
  status: 400 | 404 | 409;
  constructor(message: string, status: 400 | 404 | 409) {
    super(message);
    this.status = status;
  }
}

type NewTopicInput = {
  subjectId: string;
  title: string;
  description?: string;
  expectedDurationDays?: number;
  summaryFormat?: SummaryFormat;
};

export class ProgrammeTopicService {
  // ------------------------------------------------------------
  // Guards
  // ------------------------------------------------------------
  private async getProgramme(programmeId: string) {
    const [row] = await db
      .select({ id: programmes.id, status: programmes.status })
      .from(programmes)
      .where(eq(programmes.id, programmeId))
      .limit(1);
    if (!row) throw new ProgrammeTopicError('Programme not found', 404);
    return row;
  }

  // Locked programmes are read-only.
  private async getEditableProgramme(programmeId: string) {
    const programme = await this.getProgramme(programmeId);
    if (programme.status === 'locked') {
      throw new ProgrammeTopicError('Programme is locked. Change its status before editing its topics.', 409);
    }
    return programme;
  }

  // ------------------------------------------------------------
  // Read
  // ------------------------------------------------------------
  // The programme's sequence, in order. Every write below returns this same list
  // so the UI can replace its state in one go.
  async listTopics(programmeId: string) {
    await this.getProgramme(programmeId);

    return db
      .select({
        topicId: topics.id,
        sequenceOrder: programmeTopics.sequenceOrder,
        title: topics.title,
        description: topics.description,
        expectedDurationDays: topics.expectedDurationDays,
        summaryFormat: topics.summaryFormat,
        subjectId: topics.subjectId,
        subjectTitle: subjects.title,
      })
      .from(programmeTopics)
      .innerJoin(topics, eq(programmeTopics.topicId, topics.id))
      .leftJoin(subjects, eq(topics.subjectId, subjects.id))
      .where(eq(programmeTopics.programmeId, programmeId))
      .orderBy(asc(programmeTopics.sequenceOrder));
  }

  // Pool topics NOT yet in this programme, for the "choose subject + topic" dropdowns.
  async availableTopics(programmeId: string, subjectId?: string) {
    await this.getProgramme(programmeId);

    return db
      .select({
        id: topics.id,
        title: topics.title,
        description: topics.description,
        expectedDurationDays: topics.expectedDurationDays,
        summaryFormat: topics.summaryFormat,
        subjectId: topics.subjectId,
        subjectTitle: subjects.title,
      })
      .from(topics)
      .leftJoin(subjects, eq(topics.subjectId, subjects.id))
      .where(
        and(
          sql`not exists (select 1 from programme_topics pt where pt.programme_id = ${programmeId}::uuid and pt.topic_id = topics.id)`,
          subjectId ? eq(topics.subjectId, subjectId) : undefined
        )
      )
      .orderBy(asc(subjects.title), asc(topics.title));
  }

  // ------------------------------------------------------------
  // Write
  // ------------------------------------------------------------
  private async attach(programmeId: string, topicId: string) {
    const [already] = await db
      .select({ id: programmeTopics.id })
      .from(programmeTopics)
      .where(and(eq(programmeTopics.programmeId, programmeId), eq(programmeTopics.topicId, topicId)))
      .limit(1);
    if (already) throw new ProgrammeTopicError('Topic is already in this programme', 409);

    const [{ last }] = await db
      .select({ last: sql<number>`coalesce(max(${programmeTopics.sequenceOrder}), 0)::int` })
      .from(programmeTopics)
      .where(eq(programmeTopics.programmeId, programmeId));

    await db.insert(programmeTopics).values({ programmeId, topicId, sequenceOrder: last + 1 });
  }

  // Attach an existing topic to the end of the sequence.
  async addExisting(programmeId: string, topicId: string) {
    await this.getEditableProgramme(programmeId);

    const [topic] = await db.select({ id: topics.id }).from(topics).where(eq(topics.id, topicId)).limit(1);
    if (!topic) throw new ProgrammeTopicError('Topic not found', 404);

    await this.attach(programmeId, topicId);
    return this.listTopics(programmeId);
  }

  // Create a new topic in the shared pool (no class), then attach it.
  async createAndAttach(programmeId: string, data: NewTopicInput) {
    await this.getEditableProgramme(programmeId);

    const [subject] = await db.select({ id: subjects.id }).from(subjects).where(eq(subjects.id, data.subjectId)).limit(1);
    if (!subject) throw new ProgrammeTopicError('Subject not found', 404);

    const [topic] = await db
      .insert(topics)
      .values({
        subjectId: data.subjectId,
        title: data.title,
        description: data.description,
        expectedDurationDays: data.expectedDurationDays ?? 1,
        summaryFormat: data.summaryFormat,
      })
      .returning({ id: topics.id });

    try {
      await this.attach(programmeId, topic.id);
    } catch (err) {
      await db.delete(topics).where(eq(topics.id, topic.id)); // don't leave an orphan behind
      throw err;
    }

    return this.listTopics(programmeId);
  }

  // Sets or clears the topic's summary format. The topic is shared, so every programme using it sees the change.
  async setSummaryFormat(programmeId: string, topicId: string, summaryFormat: SummaryFormat | null) {
    await this.getEditableProgramme(programmeId);

    const [link] = await db
      .select({ id: programmeTopics.id })
      .from(programmeTopics)
      .where(and(eq(programmeTopics.programmeId, programmeId), eq(programmeTopics.topicId, topicId)))
      .limit(1);
    if (!link) throw new ProgrammeTopicError('Topic is not in this programme', 404);

    await db.update(topics).set({ summaryFormat }).where(eq(topics.id, topicId));
    return this.listTopics(programmeId);
  }

  // Detach only. The topic stays in the pool and in any other programme.
  async removeTopic(programmeId: string, topicId: string) {
    const programme = await this.getEditableProgramme(programmeId);

    const rows = await db
      .select({ topicId: programmeTopics.topicId })
      .from(programmeTopics)
      .where(eq(programmeTopics.programmeId, programmeId));

    if (!rows.some((r) => r.topicId === topicId)) {
      throw new ProgrammeTopicError('Topic is not in this programme', 404);
    }
    if (programme.status === 'published' && rows.length === 1) {
      throw new ProgrammeTopicError('A published programme needs at least one topic. Unpublish it first.', 409);
    }

    await db
      .delete(programmeTopics)
      .where(and(eq(programmeTopics.programmeId, programmeId), eq(programmeTopics.topicId, topicId)));

    // Close the gap: renumber what is left as 1..n in one statement.
    await db.execute(sql`
      update programme_topics pt
      set sequence_order = r.rn::int
      from (
        select id, row_number() over (order by sequence_order, created_at) as rn
        from programme_topics
        where programme_id = ${programmeId}::uuid
      ) r
      where pt.id = r.id
    `);

    return this.listTopics(programmeId);
  }

  // The list must contain exactly the programme's current topics, each once.
  async reorder(programmeId: string, topicIds: string[]) {
    await this.getEditableProgramme(programmeId);

    const current = await db
      .select({ topicId: programmeTopics.topicId })
      .from(programmeTopics)
      .where(eq(programmeTopics.programmeId, programmeId));

    const currentSet = new Set(current.map((r) => r.topicId));
    const sameSet =
      topicIds.length === currentSet.size &&
      new Set(topicIds).size === topicIds.length &&
      topicIds.every((id) => currentSet.has(id));

    if (!sameSet) {
      throw new ProgrammeTopicError("topicIds must contain exactly the programme's current topics, each once", 400);
    }

    // One UPDATE, so a reorder either fully applies or not at all (no transaction needed).
    const values = sql.join(
      topicIds.map((id, i) => sql`(${id}::uuid, ${i + 1}::int)`),
      sql`, `
    );
    await db.execute(sql`
      update programme_topics pt
      set sequence_order = v.ord
      from (values ${values}) as v(topic_id, ord)
      where pt.programme_id = ${programmeId}::uuid and pt.topic_id = v.topic_id
    `);

    return this.listTopics(programmeId);
  }
}