import { and, asc, desc, eq, gte, inArray, lte } from 'drizzle-orm';
import { db } from '../../config/db.js';
import {
  dailySubmissionFiles,
  dailySubmissionTopics,
  dailySubmissions,
  learningPlanTopics,
  learningPlans,
  scheduledSessions,
  students,
  subjects,
  topics,
} from '../../db/schema.js';
import { PaymentService } from '../payments/payments.service.js';
import type { AddFilesBody } from './daily-submissions.validation.js';

const paymentService = new PaymentService();

// Handing a day in needs a summary note. Flip this to also demand at least one file.
const REQUIRE_FILE_TO_SUBMIT = false;
const MAX_FILES_PER_DAY = 10;

export class DailySubmissionError extends Error {
  status: 400 | 402 | 404 | 409;
  constructor(message: string, status: 400 | 402 | 404 | 409) {
    super(message);
    this.status = status;
  }
}

type DayTopic = {
  learningPlanTopicId: string;
  topicId: string;
  title: string;
  subjectTitle: string | null;
  summaryFormat: { header: string; body: string }[] | null;
};

export type DayView = {
  id: string | null; // null until the student first saves something for the day
  learningPlanId: string;
  forDate: string;
  status: 'not_started' | 'draft' | 'submitted';
  summaryNote: string | null;
  submittedAt: Date | null;
  topics: DayTopic[];
  files: {
    id: string;
    fileUrl: string;
    fileKey: string | null;
    fileName: string;
    contentType: string | null;
    sizeBytes: number | null;
    createdAt: Date;
  }[];
};

type SubmissionRow = typeof dailySubmissions.$inferSelect;

export class DailySubmissionService {
  // ------------------------------------------------------------
  // Guards and helpers
  // ------------------------------------------------------------
  private async getOwnedPlan(studentId: string, planId: string) {
    const [plan] = await db
      .select({ id: learningPlans.id, status: learningPlans.status })
      .from(learningPlans)
      .where(and(eq(learningPlans.id, planId), eq(learningPlans.studentId, studentId)))
      .limit(1);
    if (!plan) throw new DailySubmissionError('Learning plan not found', 404);
    return plan;
  }

  // Same rule as the rest of the daily flow: content is unlocked by a successful payment.
  private async assertWritable(plan: { id: string; status: string }) {
    if (plan.status === 'paused' || plan.status === 'cancelled') {
      throw new DailySubmissionError(`This learning plan is ${plan.status}`, 409);
    }
    if (!(await paymentService.hasSuccessfulPayment(plan.id))) {
      throw new DailySubmissionError('Payment required before submitting work for this plan', 402);
    }
  }

  private assertOpen(submission: SubmissionRow) {
    if (submission.submittedAt) {
      throw new DailySubmissionError('This day has already been submitted. Ask your educator to reopen it.', 409);
    }
  }

  // Topics scheduled for a plan on a given day (a day can hold more than one).
  private async topicsForDate(planId: string, date: string): Promise<DayTopic[]> {
    const rows = await db
      .select({
        learningPlanTopicId: learningPlanTopics.id,
        topicId: topics.id,
        title: topics.title,
        subjectTitle: subjects.title,
        summaryFormat: topics.summaryFormat,
      })
      .from(scheduledSessions)
      .innerJoin(learningPlanTopics, eq(scheduledSessions.learningPlanTopicId, learningPlanTopics.id))
      .innerJoin(topics, eq(learningPlanTopics.topicId, topics.id))
      .leftJoin(subjects, eq(topics.subjectId, subjects.id))
      .where(and(eq(learningPlanTopics.learningPlanId, planId), eq(scheduledSessions.scheduledDate, date)))
      .orderBy(asc(learningPlanTopics.sequenceOrder));

    const seen = new Set<string>();
    return rows.filter((r) => (seen.has(r.learningPlanTopicId) ? false : (seen.add(r.learningPlanTopicId), true)));
  }

  private async findSubmission(planId: string, date: string) {
    const [row] = await db
      .select()
      .from(dailySubmissions)
      .where(and(eq(dailySubmissions.learningPlanId, planId), eq(dailySubmissions.forDate, date)))
      .limit(1);
    return row || null;
  }

  // Creates the day's row the first time the student saves anything, and freezes which
  // topics that day covered. Safe if two requests race: the unique key lets only one win.
  private async ensureSubmission(planId: string, date: string) {
    const existing = await this.findSubmission(planId, date);
    if (existing) return existing;

    const dayTopics = await this.topicsForDate(planId, date);
    if (!dayTopics.length) throw new DailySubmissionError('No sessions are scheduled for this date', 404);

    const [created] = await db
      .insert(dailySubmissions)
      .values({ learningPlanId: planId, forDate: date })
      .onConflictDoNothing()
      .returning();

    if (!created) {
      const winner = await this.findSubmission(planId, date);
      if (winner) return winner;
      throw new DailySubmissionError('Could not create the submission, please retry', 409);
    }

    try {
      await db
        .insert(dailySubmissionTopics)
        .values(dayTopics.map((t) => ({ dailySubmissionId: created.id, learningPlanTopicId: t.learningPlanTopicId })));
    } catch (err) {
      await db.delete(dailySubmissions).where(eq(dailySubmissions.id, created.id)); // no half-made day
      throw err;
    }
    return created;
  }

  private async hydrate(rows: SubmissionRow[]): Promise<DayView[]> {
    if (!rows.length) return [];
    const ids = rows.map((r) => r.id);

    const [topicRows, fileRows] = await Promise.all([
      db
        .select({
          dailySubmissionId: dailySubmissionTopics.dailySubmissionId,
          learningPlanTopicId: learningPlanTopics.id,
          topicId: topics.id,
          title: topics.title,
          subjectTitle: subjects.title,
          summaryFormat: topics.summaryFormat,
        })
        .from(dailySubmissionTopics)
        .innerJoin(learningPlanTopics, eq(dailySubmissionTopics.learningPlanTopicId, learningPlanTopics.id))
        .innerJoin(topics, eq(learningPlanTopics.topicId, topics.id))
        .leftJoin(subjects, eq(topics.subjectId, subjects.id))
        .where(inArray(dailySubmissionTopics.dailySubmissionId, ids))
        .orderBy(asc(learningPlanTopics.sequenceOrder)),
      db
        .select()
        .from(dailySubmissionFiles)
        .where(inArray(dailySubmissionFiles.dailySubmissionId, ids))
        .orderBy(asc(dailySubmissionFiles.createdAt)),
    ]);

    return rows.map((r) => ({
      id: r.id,
      learningPlanId: r.learningPlanId,
      forDate: r.forDate,
      status: r.submittedAt ? 'submitted' : 'draft',
      summaryNote: r.summaryNote,
      submittedAt: r.submittedAt,
      topics: topicRows
        .filter((t) => t.dailySubmissionId === r.id)
        .map(({ dailySubmissionId, ...topic }) => topic),
      files: fileRows
        .filter((f) => f.dailySubmissionId === r.id)
        .map(({ dailySubmissionId, ...file }) => file),
    }));
  }

  private async hydrateOne(submission: SubmissionRow) {
    const [day] = await this.hydrate([submission]);
    return day;
  }

  // ------------------------------------------------------------
  // Student
  // ------------------------------------------------------------

  // What the day looks like right now. Before anything is saved it still returns the day's
  // topics with their summary guides, so the app can show "what to write about" first.
  async getDay(studentId: string, planId: string, date: string): Promise<DayView> {
    await this.getOwnedPlan(studentId, planId);

    const submission = await this.findSubmission(planId, date);
    if (submission) return this.hydrateOne(submission);

    const dayTopics = await this.topicsForDate(planId, date);
    if (!dayTopics.length) throw new DailySubmissionError('No sessions are scheduled for this date', 404);

    return {
      id: null,
      learningPlanId: planId,
      forDate: date,
      status: 'not_started',
      summaryNote: null,
      submittedAt: null,
      topics: dayTopics,
      files: [],
    };
  }

  async saveNote(studentId: string, planId: string, date: string, summaryNote: string) {
    const plan = await this.getOwnedPlan(studentId, planId);
    await this.assertWritable(plan);

    const submission = await this.ensureSubmission(planId, date);
    this.assertOpen(submission);

    await db
      .update(dailySubmissions)
      .set({ summaryNote, updatedAt: new Date() })
      .where(eq(dailySubmissions.id, submission.id));

    return this.getDay(studentId, planId, date);
  }

  // Records files the student has already uploaded. No upload happens here.
  async addFiles(studentId: string, planId: string, date: string, files: AddFilesBody['files']) {
    const plan = await this.getOwnedPlan(studentId, planId);
    await this.assertWritable(plan);

    const submission = await this.ensureSubmission(planId, date);
    this.assertOpen(submission);

    const current = await db
      .select({ id: dailySubmissionFiles.id })
      .from(dailySubmissionFiles)
      .where(eq(dailySubmissionFiles.dailySubmissionId, submission.id));
    if (current.length + files.length > MAX_FILES_PER_DAY) {
      throw new DailySubmissionError(`You can attach at most ${MAX_FILES_PER_DAY} files per day`, 400);
    }

    await db.insert(dailySubmissionFiles).values(
      files.map((f) => ({
        dailySubmissionId: submission.id,
        fileUrl: f.fileUrl,
        fileKey: f.fileKey,
        fileName: f.fileName,
        contentType: f.contentType,
        sizeBytes: f.sizeBytes,
      }))
    );

    await db.update(dailySubmissions).set({ updatedAt: new Date() }).where(eq(dailySubmissions.id, submission.id));
    return this.getDay(studentId, planId, date);
  }

  async removeFile(studentId: string, planId: string, date: string, fileId: string) {
    await this.getOwnedPlan(studentId, planId);

    const submission = await this.findSubmission(planId, date);
    if (!submission) throw new DailySubmissionError('Nothing submitted for this date yet', 404);
    this.assertOpen(submission);

    const removed = await db
      .delete(dailySubmissionFiles)
      .where(and(eq(dailySubmissionFiles.id, fileId), eq(dailySubmissionFiles.dailySubmissionId, submission.id)))
      .returning({ id: dailySubmissionFiles.id });
    if (!removed.length) throw new DailySubmissionError('File not found', 404);

    return this.getDay(studentId, planId, date);
  }

  // Hands the day in. After this the student can no longer change it.
  async submit(studentId: string, planId: string, date: string) {
    const plan = await this.getOwnedPlan(studentId, planId);
    await this.assertWritable(plan);

    const submission = await this.findSubmission(planId, date);
    if (!submission) throw new DailySubmissionError('Write your summary note before submitting', 400);
    this.assertOpen(submission);

    if (!submission.summaryNote || !submission.summaryNote.trim()) {
      throw new DailySubmissionError('A summary note is required to submit', 400);
    }
    if (REQUIRE_FILE_TO_SUBMIT) {
      const files = await db
        .select({ id: dailySubmissionFiles.id })
        .from(dailySubmissionFiles)
        .where(eq(dailySubmissionFiles.dailySubmissionId, submission.id))
        .limit(1);
      if (!files.length) throw new DailySubmissionError('Attach at least one file to submit', 400);
    }

    await db
      .update(dailySubmissions)
      .set({ submittedAt: new Date(), updatedAt: new Date() })
      .where(eq(dailySubmissions.id, submission.id));

    return this.getDay(studentId, planId, date);
  }

  // ------------------------------------------------------------
  // Educator / admin (the controller checks who may see which student)
  // ------------------------------------------------------------
  async studentExists(studentId: string) {
    const [row] = await db.select({ id: students.id }).from(students).where(eq(students.id, studentId)).limit(1);
    return !!row;
  }

  // Days a student has worked on, newest first, with topics and files. Also serves the student's own list.
  async listForStudent(
    studentId: string,
    opts: { learningPlanId?: string; topicId?: string; from?: string; to?: string } = {}
  ) {
    const rows = await db
      .select({ submission: dailySubmissions })
      .from(dailySubmissions)
      .innerJoin(learningPlans, eq(dailySubmissions.learningPlanId, learningPlans.id))
      .where(
        and(
          eq(learningPlans.studentId, studentId),
          opts.learningPlanId ? eq(dailySubmissions.learningPlanId, opts.learningPlanId) : undefined,
          opts.from ? gte(dailySubmissions.forDate, opts.from) : undefined,
          opts.to ? lte(dailySubmissions.forDate, opts.to) : undefined,
          // "every day that covered this topic": answered from the frozen topic links
          opts.topicId
            ? inArray(
                dailySubmissions.id,
                db
                  .select({ id: dailySubmissionTopics.dailySubmissionId })
                  .from(dailySubmissionTopics)
                  .innerJoin(learningPlanTopics, eq(dailySubmissionTopics.learningPlanTopicId, learningPlanTopics.id))
                  .where(eq(learningPlanTopics.topicId, opts.topicId))
              )
            : undefined
        )
      )
      .orderBy(desc(dailySubmissions.forDate));

    return this.hydrate(rows.map((r) => r.submission));
  }

  // Unlocks a submitted day so the student can edit it again.
  async reopen(studentId: string, submissionId: string) {
    const [row] = await db
      .select({ submission: dailySubmissions })
      .from(dailySubmissions)
      .innerJoin(learningPlans, eq(dailySubmissions.learningPlanId, learningPlans.id))
      .where(and(eq(dailySubmissions.id, submissionId), eq(learningPlans.studentId, studentId)))
      .limit(1);
    if (!row) return null;

    await db
      .update(dailySubmissions)
      .set({ submittedAt: null, updatedAt: new Date() })
      .where(eq(dailySubmissions.id, submissionId));

    const [fresh] = await db.select().from(dailySubmissions).where(eq(dailySubmissions.id, submissionId)).limit(1);
    return this.hydrateOne(fresh);
  }
}