// ------------------------------------------------------------------
// This is your real programme-learning-plan.service.ts with THREE changes:
//   1. Question selection now uses pickQuizQuestions() (fair per-topic split)
//      instead of pooling everything and slicing randomly.
//   2. quizDurationMinutes is accepted and snapshotted onto learningPlans +
//      every weeklyQuizzes row it generates.
//   3. Each weeklyQuizQuestions row now snapshots topicId + imageUrl.
// Your buildProgrammeScheduleEven import/usage is untouched — I haven't seen
// that file change and didn't want to guess at it. Diff before applying.
// ------------------------------------------------------------------

import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { db } from '../../config/db.js';
import {
  learningPlans,
  learningPlanTopics,
  scheduledSessions,
  programmes,
  programmeTopics,
  programmePrices,
  topics,
  students,
  questions,
  weeklyQuizzes,
  weeklyQuizQuestions,
  payments,
} from '../../db/schema.js';
import { buildProgrammeScheduleEven, type QuizIsoDay } from '../../shared/programme-schedule.js';
import { pickQuizQuestions } from '../../shared/quiz-question-picker.js'; // NEW
import type { CreateProgrammePlanBody } from './programme-learning-plan.validation.js';

export class ProgrammePlanError extends Error {
  status: 400 | 404;
  constructor(message: string, status: 400 | 404) {
    super(message);
    this.status = status;
  }
}

const DAY_NAMES = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export class ProgrammeLearningPlanService {
  async create(studentId: string, input: CreateProgrammePlanBody) {
    const [student] = await db
      .select({ id: students.id, educatorId: students.educatorId })
      .from(students)
      .where(eq(students.id, studentId))
      .limit(1);
    if (!student) throw new ProgrammePlanError('Student not found', 404);

    const [programme] = await db
      .select({ id: programmes.id, status: programmes.status })
      .from(programmes)
      .where(eq(programmes.id, input.programmeId))
      .limit(1);
    if (!programme) throw new ProgrammePlanError('Programme not found', 404);
    if (programme.status !== 'published') throw new ProgrammePlanError('Programme is not published', 400);

    const start = new Date(`${input.startDate}T00:00:00Z`);
    if (Number.isNaN(start.getTime())) throw new ProgrammePlanError('startDate is not a valid date', 400);
    if (start.getUTCDay() !== 1) throw new ProgrammePlanError('startDate must be a Monday', 400);

    const stepRows = await db
      .select({ id: topics.id, subjectId: topics.subjectId })
      .from(programmeTopics)
      .innerJoin(topics, eq(programmeTopics.topicId, topics.id))
      .where(eq(programmeTopics.programmeId, input.programmeId))
      .orderBy(asc(programmeTopics.sequenceOrder));

    if (stepRows.length === 0) {
      throw new ProgrammePlanError('Programme has no topics', 400);
    }

    const topicIds = stepRows.map((s) => s.id);
    // Subject each topic belongs to, and the order subjects first appear in the
    // programme sequence — used below to group quiz questions by subject.
    const subjectByTopic = new Map(stepRows.map((s) => [s.id, s.subjectId]));
    const subjectOrder: string[] = [];
    for (const s of stepRows) {
      const key = s.subjectId ?? '__none__';
      if (!subjectOrder.includes(key)) subjectOrder.push(key);
    }
    const quizIsoDay: QuizIsoDay = input.quizDay === 'friday' ? 5 : 6;
    const learningPerWeek = quizIsoDay - 1;

    // NO expectedDurationDays capacity check — UI even-spread model

    const activePrice = await db
      .select({ id: programmePrices.id, priceNaira: programmePrices.priceNaira })
      .from(programmePrices)
      .where(and(eq(programmePrices.programmeId, input.programmeId), eq(programmePrices.isActive, true)))
      .orderBy(desc(programmePrices.createdAt))
      .limit(1)
      .then((r) => r[0]);
    if (!activePrice) {
      throw new ProgrammePlanError('No active price is set for this programme', 400);
    }

    const schedule = buildProgrammeScheduleEven(topicIds, {
      weeks: input.weeks,
      quizDay: quizIsoDay,
      startDate: start,
    });
    const lastQuizDate = schedule.quizzes[schedule.quizzes.length - 1]?.date;

    const [plan] = await db
      .insert(learningPlans)
      .values({
        studentId,
        educatorId: student.educatorId,
        programmeId: input.programmeId,
        weeks: input.weeks,
        quizDay: input.quizDay,
        quizSize: input.quizSize,
        quizDurationMinutes: input.quizDurationMinutes ?? null, // NEW
        sessionsPerWeek: learningPerWeek,
        preferredDays: DAY_NAMES.slice(0, learningPerWeek),
        startDate: input.startDate,
        endDate: lastQuizDate ?? input.startDate,
        status: 'active',
        requireCorrectAnswersToProgress: input.requireCorrectAnswersToProgress ?? true,
      })
      .returning();

    // One learningPlanTopics row per programme topic, sequence preserved from programme_topics.
    const lptRows = await db
      .insert(learningPlanTopics)
      .values(
        topicIds.map((topicId, i) => ({
          learningPlanId: plan.id,
          topicId,
          sequenceOrder: i + 1,
          status: 'pending' as const,
        }))
      )
      .returning({ id: learningPlanTopics.id, topicId: learningPlanTopics.topicId });

    const lptByTopic = new Map(lptRows.map((r) => [r.topicId, r.id]));

    if (schedule.sessions.length) {
      await db.insert(scheduledSessions).values(
        schedule.sessions.map((s) => ({
          learningPlanTopicId: lptByTopic.get(s.topicId)!,
          scheduledDate: s.date,
          sessionDayNumber: s.sessionDayNumber,
          isCompleted: false,
        }))
      );
    }

    // Weekly quizzes. Questions are now chosen with a FAIR SPLIT across that
    // week's topics (pickQuizQuestions), not a flat pool + random slice — so
    // one heavily-stocked topic can no longer crowd out a thin one. If the
    // combined pool is still smaller than quizSize, you just get everything
    // that exists; nothing errors.
    for (const q of schedule.quizzes) {
      const pool = q.topicIds.length
        ? await db
            .select()
            .from(questions)
            .where(and(inArray(questions.topicId, q.topicIds), eq(questions.isActive, true)))
        : [];
      const chosen = pickQuizQuestions(q.topicIds, pool, input.quizSize); // fair split per topic
      // Group by subject (programme sequence order), random within each subject —
      // this is what makes the quiz present subject-by-subject to the student.
      chosen.sort((a, b) => {
        const ai = subjectOrder.indexOf(subjectByTopic.get(a.topicId) ?? '__none__');
        const bi = subjectOrder.indexOf(subjectByTopic.get(b.topicId) ?? '__none__');
        return ai - bi;
      });

      const [quizRow] = await db
        .insert(weeklyQuizzes)
        .values({
          learningPlanId: plan.id,
          weekNumber: q.week,
          scheduledDate: q.date,
          requestedSize: input.quizSize,
          durationMinutes: input.quizDurationMinutes ?? null, // NEW — snapshotted per quiz
          topicIds: q.topicIds,
          status: 'pending',
        })
        .returning({ id: weeklyQuizzes.id });

      if (chosen.length) {
        await db.insert(weeklyQuizQuestions).values(
          chosen.map((question, i) => ({
            weeklyQuizId: quizRow.id,
            questionId: question.id,
            topicId: question.topicId, // NEW — which of this week's topics it came from
            orderIndex: i + 1,
            type: question.type,
            text: question.text,
            imageUrl: question.imageUrl, // NEW
            options: question.options,
            correctIndex: question.correctIndex,
            acceptedAnswers: question.acceptedAnswers,
            feedback: question.feedback,
          }))
        );
      }
    }

    // A pending payment the student must clear before any content unlocks —
    // hasSuccessfulPayment(plan.id) already gates getCurrentSession/getSessionDetail,
    // so nothing in daily.service.ts needs to change for this to take effect.
    const [payment] = await db
      .insert(payments)
      .values({
        studentId,
        learningPlanId: plan.id,
        pricingTierId: null,
        programmePriceId: activePrice.id,
        amountNaira: activePrice.priceNaira,
        status: 'pending',
      })
      .returning();

    return { plan, paymentId: payment.id, amountNaira: activePrice.priceNaira };
  }
}