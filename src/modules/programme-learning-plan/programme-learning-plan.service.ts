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
// import { buildProgrammeSchedule, type ProgrammeStep, type QuizIsoDay } from '../../shared/programme-schedule.js';
import { buildProgrammeScheduleEven, type QuizIsoDay } from '../../shared/programme-schedule.js';
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

    // const steps: ProgrammeStep[] = await db
    //   .select({ id: topics.id, expectedDurationDays: topics.expectedDurationDays })
    //   .from(programmeTopics)
    //   .innerJoin(topics, eq(programmeTopics.topicId, topics.id))
    //   .where(eq(programmeTopics.programmeId, input.programmeId))
    //   .orderBy(asc(programmeTopics.sequenceOrder));
    // if (steps.length === 0) throw new ProgrammePlanError('Programme has no topics', 400);

    // const quizIsoDay: QuizIsoDay = input.quizDay === 'friday' ? 5 : 6;
    // const learningPerWeek = quizIsoDay - 1;
    // const totalLearningSlots = input.weeks * learningPerWeek;
    // const totalDurationDays = steps.reduce((sum, s) => sum + s.expectedDurationDays, 0);
    // if (totalDurationDays > totalLearningSlots) {
    //   throw new ProgrammePlanError(
    //     `This programme needs ${totalDurationDays} learning day(s) but ${input.weeks} week(s) with a ${input.quizDay} quiz only provides ${totalLearningSlots}. Increase weeks, move the quiz day later, or shorten topics.`,
    //     400
    //   );
    // }

    // const activePrice = await db
    //   .select({ id: programmePrices.id, priceNaira: programmePrices.priceNaira })
    //   .from(programmePrices)
    //   .where(and(eq(programmePrices.programmeId, input.programmeId), eq(programmePrices.isActive, true)))
    //   .orderBy(desc(programmePrices.createdAt))
    //   .limit(1)
    //   .then((r) => r[0]);
    // if (!activePrice) throw new ProgrammePlanError('No active price is set for this programme', 400);

    // const schedule = buildProgrammeSchedule(steps, { weeks: input.weeks, quizDay: quizIsoDay, startDate: start });
    // const lastQuizDate = schedule.quizzes[schedule.quizzes.length - 1]?.date;


        const stepRows = await db
      .select({ id: topics.id })
      .from(programmeTopics)
      .innerJoin(topics, eq(programmeTopics.topicId, topics.id))
      .where(eq(programmeTopics.programmeId, input.programmeId))
      .orderBy(asc(programmeTopics.sequenceOrder));

    if (stepRows.length === 0) {
      throw new ProgrammePlanError('Programme has no topics', 400);
    }

    const topicIds = stepRows.map((s) => s.id);
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

    // Weekly quizzes, each stocked with up to `quizSize` random active questions
    // drawn from that week's topics. If fewer exist, the quiz just gets fewer —
    // requestedSize (input) vs actual question count (queryable) shows the shortfall.
    for (const q of schedule.quizzes) {
      const pool = q.topicIds.length
        ? await db
            .select()
            .from(questions)
            .where(and(inArray(questions.topicId, q.topicIds), eq(questions.isActive, true)))
        : [];
      const chosen = shuffle(pool).slice(0, input.quizSize);

      const [quizRow] = await db
        .insert(weeklyQuizzes)
        .values({
          learningPlanId: plan.id,
          weekNumber: q.week,
          scheduledDate: q.date,
          requestedSize: input.quizSize,
          topicIds: q.topicIds,
          status: 'pending',
        })
        .returning({ id: weeklyQuizzes.id });

      if (chosen.length) {
        await db.insert(weeklyQuizQuestions).values(
          chosen.map((question, i) => ({
            weeklyQuizId: quizRow.id,
            questionId: question.id,
            orderIndex: i + 1,
            type: question.type,
            text: question.text,
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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}