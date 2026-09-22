import { and, asc, eq, ilike, inArray, sql } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { programmes, programmeTopics, questions, subjects, topics } from '../../db/schema.js';
import type { CreateQuestionBody, UpdateQuestionBody } from './question-bank.validation.js';

export class QuestionBankError extends Error {
  status: 400 | 404;
  constructor(message: string, status: 400 | 404) {
    super(message);
    this.status = status;
  }
}

// Admin-only shape: it includes the answer key (correctIndex / acceptedAnswers).
// Never reuse this on a student endpoint.
const columns = {
  id: questions.id,
  topicId: questions.topicId,
  topicTitle: topics.title,
  subjectId: topics.subjectId,
  subjectTitle: subjects.title,
  type: questions.type,
  text: questions.text,
  options: questions.options,
  correctIndex: questions.correctIndex,
  acceptedAnswers: questions.acceptedAnswers,
  feedback: questions.feedback,
  isActive: questions.isActive,
  createdAt: questions.createdAt,
  updatedAt: questions.updatedAt,
};

export class QuestionBankService {
  private selectQuestions() {
    return db
      .select(columns)
      .from(questions)
      .innerJoin(topics, eq(questions.topicId, topics.id))
      .leftJoin(subjects, eq(topics.subjectId, subjects.id));
  }

  private async assertTopicExists(topicId: string) {
    const [row] = await db.select({ id: topics.id }).from(topics).where(eq(topics.id, topicId)).limit(1);
    if (!row) throw new QuestionBankError('Topic not found', 404);
  }

  // ------------------------------------------------------------
  // Read
  // ------------------------------------------------------------
  async list(opts: {
    subjectId?: string;
    topicId?: string;
    type?: 'multiple_choice' | 'fill_blank';
    search?: string;
    includeInactive?: boolean;
    limit: number;
    offset: number;
  }) {
    const where = and(
      opts.includeInactive ? undefined : eq(questions.isActive, true),
      opts.topicId ? eq(questions.topicId, opts.topicId) : undefined,
      opts.subjectId ? eq(topics.subjectId, opts.subjectId) : undefined,
      opts.type ? eq(questions.type, opts.type) : undefined,
      opts.search ? ilike(questions.text, `%${opts.search}%`) : undefined
    );

    const items = await this.selectQuestions()
      .where(where)
      .orderBy(asc(subjects.title), asc(topics.title), asc(questions.createdAt))
      .limit(opts.limit)
      .offset(opts.offset);

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(questions)
      .innerJoin(topics, eq(questions.topicId, topics.id))
      .where(where);

    return { items, total, limit: opts.limit, offset: opts.offset };
  }

  async getById(id: string) {
    const [row] = await this.selectQuestions().where(eq(questions.id, id)).limit(1);
    return row || null;
  }

  // How many active questions each topic of a programme has, in sequence order.
  // Weekly quizzes of 10 / 50 / 100 questions need enough questions behind the topics they cover.
  async coverage(programmeId: string) {
    const [programme] = await db.select({ id: programmes.id }).from(programmes).where(eq(programmes.id, programmeId)).limit(1);
    if (!programme) throw new QuestionBankError('Programme not found', 404);

    const rows = await db
      .select({
        topicId: topics.id,
        sequenceOrder: programmeTopics.sequenceOrder,
        title: topics.title,
        subjectTitle: subjects.title,
        questionCount: sql<number>`count(${questions.id})::int`,
      })
      .from(programmeTopics)
      .innerJoin(topics, eq(programmeTopics.topicId, topics.id))
      .leftJoin(subjects, eq(topics.subjectId, subjects.id))
      .leftJoin(questions, and(eq(questions.topicId, topics.id), eq(questions.isActive, true)))
      .where(eq(programmeTopics.programmeId, programmeId))
      .groupBy(topics.id, programmeTopics.sequenceOrder, topics.title, subjects.title)
      .orderBy(asc(programmeTopics.sequenceOrder));

    return {
      topics: rows,
      totalQuestions: rows.reduce((sum, r) => sum + r.questionCount, 0),
    };
  }

  // ------------------------------------------------------------
  // Write
  // ------------------------------------------------------------
  async create(data: CreateQuestionBody) {
    await this.assertTopicExists(data.topicId);

    const [row] = await db
      .insert(questions)
      .values(
        data.type === 'multiple_choice'
          ? {
              topicId: data.topicId,
              type: 'multiple_choice',
              text: data.text,
              options: data.options,
              correctIndex: data.correctIndex,
              feedback: data.feedback,
            }
          : {
              topicId: data.topicId,
              type: 'fill_blank',
              text: data.text,
              acceptedAnswers: data.acceptedAnswers,
              feedback: data.feedback,
            }
      )
      .returning({ id: questions.id });

    return this.getById(row.id);
  }

  // A single INSERT, so an import either fully lands or not at all.
  async bulkCreate(items: CreateQuestionBody[]) {
    const topicIds = [...new Set(items.map((i) => i.topicId))];
    const found = await db.select({ id: topics.id }).from(topics).where(inArray(topics.id, topicIds));
    const foundIds = new Set(found.map((t) => t.id));
    const missing = topicIds.filter((id) => !foundIds.has(id));
    if (missing.length) {
      throw new QuestionBankError(`Unknown topicId(s): ${missing.join(', ')}`, 404);
    }

    const inserted = await db
      .insert(questions)
      .values(
        items.map((i) =>
          i.type === 'multiple_choice'
            ? {
                topicId: i.topicId,
                type: 'multiple_choice' as const,
                text: i.text,
                options: i.options,
                correctIndex: i.correctIndex,
                feedback: i.feedback,
              }
            : {
                topicId: i.topicId,
                type: 'fill_blank' as const,
                text: i.text,
                acceptedAnswers: i.acceptedAnswers,
                feedback: i.feedback,
              }
        )
      )
      .returning({ id: questions.id });

    return { created: inserted.length };
  }

  async update(id: string, patch: UpdateQuestionBody) {
    const existing = await this.getById(id);
    if (!existing) return null;

    if (patch.topicId && patch.topicId !== existing.topicId) {
      await this.assertTopicExists(patch.topicId);
    }

    // Editing an mcq-only or fill_blank-only field on the wrong type is a no-op field,
    // not an error — Drizzle just writes to a column that stays irrelevant for that type.
    // (type itself is immutable here — see validation comment.)
    await db
      .update(questions)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(questions.id, id));

    return this.getById(id);
  }

  // "Delete" = archive. Quiz history will point at questions, and a hard delete would leave holes.
  async archive(id: string) {
    return this.update(id, { isActive: false });
  }

  // Used by the daily/quiz grader once weekly quizzes exist — not wired to a route yet.
  static gradeFillBlank(acceptedAnswers: string[], response: string): boolean {
    const norm = (s: string) => s.trim().toLowerCase();
    const given = norm(response ?? '');
    return acceptedAnswers.some((a) => norm(a) === given);
  }
}