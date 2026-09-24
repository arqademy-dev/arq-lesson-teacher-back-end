import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { learningPlans, weeklyQuizzes, weeklyQuizQuestions, weeklyQuizAnswers } from '../../db/schema.js';
import { PaymentService } from '../payments/payments.service.js';
import type { SaveAnswerBody } from './weekly-quizzes.validation.js';

export class WeeklyQuizError extends Error {
  status: 400 | 402 | 404;
  constructor(message: string, status: 400 | 402 | 404) {
    super(message);
    this.status = status;
  }
}

const paymentService = new PaymentService();

export class WeeklyQuizService {
  private async assertOwnedPaidPlan(learningPlanId: string, studentId: string) {
    const [plan] = await db
      .select({ id: learningPlans.id })
      .from(learningPlans)
      .where(and(eq(learningPlans.id, learningPlanId), eq(learningPlans.studentId, studentId)))
      .limit(1);
    if (!plan) throw new WeeklyQuizError('Learning plan not found', 404);

    const paid = await paymentService.hasSuccessfulPayment(learningPlanId);
    if (!paid) throw new WeeklyQuizError('Payment required before quizzes are available', 402);
  }

  // The "history" view: every week, its status, and its score once submitted.
  async list(learningPlanId: string, studentId: string) {
    await this.assertOwnedPaidPlan(learningPlanId, studentId);

    return db
      .select({
        id: weeklyQuizzes.id,
        weekNumber: weeklyQuizzes.weekNumber,
        scheduledDate: weeklyQuizzes.scheduledDate,
        status: weeklyQuizzes.status,
        requestedSize: weeklyQuizzes.requestedSize,
        score: weeklyQuizzes.score,
        submittedAt: weeklyQuizzes.submittedAt,
        totalQuestions: sql<number>`(select count(*)::int from weekly_quiz_questions q where q.weekly_quiz_id = weekly_quizzes.id)`,
      })
      .from(weeklyQuizzes)
      .where(eq(weeklyQuizzes.learningPlanId, learningPlanId))
      .orderBy(asc(weeklyQuizzes.weekNumber));
  }

  private async getQuizOwned(weeklyQuizId: string, studentId: string) {
    const [quiz] = await db
      .select({
        id: weeklyQuizzes.id,
        learningPlanId: weeklyQuizzes.learningPlanId,
        weekNumber: weeklyQuizzes.weekNumber,
        scheduledDate: weeklyQuizzes.scheduledDate,
        status: weeklyQuizzes.status,
        score: weeklyQuizzes.score,
        submittedAt: weeklyQuizzes.submittedAt,
      })
      .from(weeklyQuizzes)
      .innerJoin(learningPlans, eq(weeklyQuizzes.learningPlanId, learningPlans.id))
      .where(and(eq(weeklyQuizzes.id, weeklyQuizId), eq(learningPlans.studentId, studentId)))
      .limit(1);
    if (!quiz) throw new WeeklyQuizError('Quiz not found', 404);

    const paid = await paymentService.hasSuccessfulPayment(quiz.learningPlanId);
    if (!paid) throw new WeeklyQuizError('Payment required before this quiz is available', 402);

    return quiz;
  }

  // Not submitted: questions + options only, no answer key, plus whatever the
  // student has saved so far (no correctness shown). Submitted: everything,
  // including correct answers and per-question correctness — this is the one
  // place the answer key is ever exposed to a student.
  async getDetail(weeklyQuizId: string, studentId: string) {
    const quiz = await this.getQuizOwned(weeklyQuizId, studentId);
    const revealed = quiz.status === 'submitted';

    const questionRows = await db
      .select()
      .from(weeklyQuizQuestions)
      .where(eq(weeklyQuizQuestions.weeklyQuizId, weeklyQuizId))
      .orderBy(asc(weeklyQuizQuestions.orderIndex));

    const answers = questionRows.length
      ? await db
          .select()
          .from(weeklyQuizAnswers)
          .where(inArray(weeklyQuizAnswers.weeklyQuizQuestionId, questionRows.map((q) => q.id)))
      : [];
    const answerByQuestion = new Map(answers.map((a) => [a.weeklyQuizQuestionId, a]));

    const questions = questionRows.map((q) => {
      const ans = answerByQuestion.get(q.id);
      const myAnswer = ans
        ? q.type === 'multiple_choice'
          ? { selectedIndex: (ans.studentResponse as any)?.selectedIndex ?? null }
          : { answerText: (ans.studentResponse as any)?.answerText ?? null }
        : null;

      const base = { id: q.id, orderIndex: q.orderIndex, type: q.type, text: q.text, options: q.options, myAnswer };
      if (!revealed) return base;

      return {
        ...base,
        correctIndex: q.correctIndex,
        acceptedAnswers: q.acceptedAnswers,
        feedback: q.feedback,
        isCorrect: ans?.isCorrect ?? false,
        scoreAwarded: ans?.scoreAwarded ?? 0,
      };
    });

    return { ...quiz, questions };
  }

  async saveAnswer(weeklyQuizId: string, questionId: string, studentId: string, response: SaveAnswerBody) {
    const quiz = await this.getQuizOwned(weeklyQuizId, studentId);
    if (quiz.status === 'submitted') throw new WeeklyQuizError('This quiz has already been submitted', 400);

    const [question] = await db
      .select({ id: weeklyQuizQuestions.id })
      .from(weeklyQuizQuestions)
      .where(and(eq(weeklyQuizQuestions.id, questionId), eq(weeklyQuizQuestions.weeklyQuizId, weeklyQuizId)))
      .limit(1);
    if (!question) throw new WeeklyQuizError('Question not found on this quiz', 404);

    const [existing] = await db
      .select({ id: weeklyQuizAnswers.id })
      .from(weeklyQuizAnswers)
      .where(eq(weeklyQuizAnswers.weeklyQuizQuestionId, questionId))
      .limit(1);

    if (existing) {
      await db
        .update(weeklyQuizAnswers)
        .set({ studentResponse: response, submittedAt: new Date() })
        .where(eq(weeklyQuizAnswers.id, existing.id));
    } else {
      await db.insert(weeklyQuizAnswers).values({ weeklyQuizQuestionId: questionId, studentResponse: response, submittedAt: new Date() });
    }
    return { saved: true };
  }

  // Grades every question at once and locks the quiz. This is the only point at
  // which correctness/score is computed — nothing is graded per-answer as you go.
  async submit(weeklyQuizId: string, studentId: string) {
    const quiz = await this.getQuizOwned(weeklyQuizId, studentId);
    if (quiz.status === 'submitted') throw new WeeklyQuizError('This quiz has already been submitted', 400);

    const questionRows = await db.select().from(weeklyQuizQuestions).where(eq(weeklyQuizQuestions.weeklyQuizId, weeklyQuizId));
    const answers = questionRows.length
      ? await db
          .select()
          .from(weeklyQuizAnswers)
          .where(inArray(weeklyQuizAnswers.weeklyQuizQuestionId, questionRows.map((q) => q.id)))
      : [];
    const answerByQuestion = new Map(answers.map((a) => [a.weeklyQuizQuestionId, a]));

    let score = 0;
    for (const q of questionRows) {
      const ans = answerByQuestion.get(q.id);
      if (!ans) continue; // unanswered — stays scoreAwarded 0, isCorrect null

      let isCorrect: boolean;
      if (q.type === 'multiple_choice') {
        isCorrect = (ans.studentResponse as any)?.selectedIndex === q.correctIndex;
      } else {
        const given = String((ans.studentResponse as any)?.answerText ?? '').trim().toLowerCase();
        isCorrect = (q.acceptedAnswers ?? []).some((a) => a.trim().toLowerCase() === given);
      }
      const scoreAwarded = isCorrect ? 1 : 0;
      score += scoreAwarded;
      await db.update(weeklyQuizAnswers).set({ isCorrect, scoreAwarded }).where(eq(weeklyQuizAnswers.id, ans.id));
    }

    await db.update(weeklyQuizzes).set({ status: 'submitted', submittedAt: new Date(), score }).where(eq(weeklyQuizzes.id, weeklyQuizId));
    return this.getDetail(weeklyQuizId, studentId);
  }

  // For educator/admin read-only views — same reveal rules as the student sees.
  async getDetailForOwner(weeklyQuizId: string) {
    const [quiz] = await db.select({ learningPlanId: weeklyQuizzes.learningPlanId }).from(weeklyQuizzes).where(eq(weeklyQuizzes.id, weeklyQuizId)).limit(1);
    if (!quiz) throw new WeeklyQuizError('Quiz not found', 404);
    const [plan] = await db.select({ studentId: learningPlans.studentId }).from(learningPlans).where(eq(learningPlans.id, quiz.learningPlanId)).limit(1);
    if (!plan) throw new WeeklyQuizError('Quiz not found', 404);
    return this.getDetail(weeklyQuizId, plan.studentId);
  }

  async listForOwner(learningPlanId: string) {
    const [plan] = await db.select({ studentId: learningPlans.studentId }).from(learningPlans).where(eq(learningPlans.id, learningPlanId)).limit(1);
    if (!plan) throw new WeeklyQuizError('Learning plan not found', 404);
    return this.list(learningPlanId, plan.studentId);
  }
}