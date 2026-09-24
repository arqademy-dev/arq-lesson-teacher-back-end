// ============================================================================
// SHARED TYPES & UTILITY FUNCTIONS
// ============================================================================

/** ISO weekday: Friday = 5, Saturday = 6. */
export type QuizIsoDay = 5 | 6;

function toYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

function addDaysString(start: Date, days: number): string {
  const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

/** Split topics into `slotCount` groups as evenly as possible (UI-style). */
function chunkEven(topicIds: string[], slotCount: number): string[][] {
  const buckets: string[][] = Array.from({ length: slotCount }, () => []);
  if (slotCount <= 0 || topicIds.length === 0) return buckets;
  const base = Math.floor(topicIds.length / slotCount);
  const rem = topicIds.length % slotCount;
  let cursor = 0;
  for (let i = 0; i < slotCount; i++) {
    const size = base + (i < rem ? 1 : 0);
    buckets[i] = topicIds.slice(cursor, cursor + size);
    cursor += size;
  }
  return buckets;
}


// ============================================================================
// APPROACH 1: EVEN CHUNK DISTRIBUTION SCHEDULE (UI-Style)
// ============================================================================

export type ScheduleSession = {
  topicId: string;
  date: string; // YYYY-MM-DD
  sessionDayNumber: number;
};

export type ScheduleQuiz = {
  week: number;
  date: string;
  topicIds: string[];
};

export type ProgrammeScheduleEven = {
  sessions: ScheduleSession[];
  quizzes: ScheduleQuiz[];
};

/**
 * UI-style schedule:
 * - learning days: Mon .. (quizDay - 1)
 * - quiz on quizDay each week
 * - topics spread evenly across learning slots
 * - empty slot = revision (no session rows)
 */
export function buildProgrammeScheduleEven(
  topicIds: string[],
  opts: { weeks: number; quizDay: QuizIsoDay; startDate: Date }
): ProgrammeScheduleEven {
  const { weeks, quizDay, startDate } = opts;
  const learningPerWeek = quizDay - 1; // 4 or 5
  const totalLearningSlots = weeks * learningPerWeek;
  const evenBuckets = chunkEven(topicIds, totalLearningSlots);
  const sessions: ScheduleSession[] = [];
  const quizzes: ScheduleQuiz[] = [];
  const sessionDayByTopic = new Map<string, number>();

  for (let w = 0; w < weeks; w++) {
    const weekStart = addDays(startDate, w * 7); // Monday
    const weekTopicIds: string[] = [];

    for (let dayOffset = 0; dayOffset < learningPerWeek; dayOffset++) {
      const date = toYmd(addDays(weekStart, dayOffset));
      const slotIndex = w * learningPerWeek + dayOffset;
      const dayTopics = evenBuckets[slotIndex] ?? [];

      for (const topicId of dayTopics) {
        const n = (sessionDayByTopic.get(topicId) ?? 0) + 1;
        sessionDayByTopic.set(topicId, n);
        sessions.push({ topicId, date, sessionDayNumber: n });
        weekTopicIds.push(topicId);
      }
    }

    quizzes.push({
      week: w + 1,
      date: toYmd(addDays(weekStart, quizDay - 1)),
      topicIds: [...new Set(weekTopicIds)],
    });
  }

  return { sessions, quizzes };
}


// ============================================================================
// APPROACH 2: CONSECUTIVE DURATION-BASED SCHEDULE (Sequential)
// ============================================================================

// Pure, no DB — turns a programme's ordered topics into real calendar dates.
//
// IMPORTANT — how this stays compatible with your existing daily.service.ts:
// getCurrentSession() walks learningPlanTopics strictly in sequenceOrder, and
// for each one waits until ALL of its scheduledSessions are complete before the
// next topic ever appears — regardless of scheduledDate. So two topics assigned
// the same calendar date do NOT become available at the same time; the date is
// only used for display and for the `isOverdue` check. This function does not
// change that — it just assigns dates to a strictly sequential list of sessions.
//
// Each topic consumes `expectedDurationDays` CONSECUTIVE learning-day slots
// (sessionDayNumber 1..N for that topic). Topics are placed back-to-back in
// sequence order; any learning-day slots left over at the end of a week (because
// the programme ran out of topics before the week's learning days did) are simply
// not used — daily.service.ts already tolerates gaps in scheduledDate.

export type ProgrammeStep = {
  id: string; // topic id
  expectedDurationDays: number;
};

export type ScheduleSessionSlot = {
  week: number;
  dayOfWeek: number; // 1-based within the week's learning days
  date: string; // YYYY-MM-DD
  topicId: string;
  sessionDayNumber: number; // 1-based within this topic
};

export type ScheduleQuizSlot = {
  week: number;
  date: string; // YYYY-MM-DD
  topicIds: string[]; // every topic this week covered, de-duplicated
};

export type ProgrammeScheduleDuration = {
  sessions: ScheduleSessionSlot[];
  quizzes: ScheduleQuizSlot[];
  totalLearningSlots: number;
  totalDurationDays: number;
};

export function buildProgrammeSchedule(
  steps: ProgrammeStep[],
  opts: { weeks: number; quizDay: QuizIsoDay; startDate: Date }
): ProgrammeScheduleDuration {
  const learningPerWeek = opts.quizDay - 1; // Friday -> 4 learning days, Saturday -> 5
  const totalLearningSlots = opts.weeks * learningPerWeek;
  const totalDurationDays = steps.reduce((sum, s) => sum + s.expectedDurationDays, 0);
  const sessions: ScheduleSessionSlot[] = [];
  const weekTopics = new Map<number, Set<string>>();

  let slot = 0; // 0-based across the whole plan
  for (const step of steps) {
    for (let day = 1; day <= step.expectedDurationDays; day++) {
      if (slot >= totalLearningSlots) break; // caller validates this can't happen — see the service
      
      const week = Math.floor(slot / learningPerWeek) + 1;
      const dayOfWeek = (slot % learningPerWeek) + 1;
      const date = addDaysString(opts.startDate, (week - 1) * 7 + (dayOfWeek - 1));
      
      sessions.push({ week, dayOfWeek, date, topicId: step.id, sessionDayNumber: day });
      
      if (!weekTopics.has(week)) weekTopics.set(week, new Set());
      weekTopics.get(week)!.add(step.id);
      
      slot++;
    }
  }

  const quizzes: ScheduleQuizSlot[] = [];
  for (let week = 1; week <= opts.weeks; week++) {
    quizzes.push({
      week,
      date: addDaysString(opts.startDate, (week - 1) * 7 + (opts.quizDay - 1)),
      topicIds: Array.from(weekTopics.get(week) ?? []),
    });
  }

  return { sessions, quizzes, totalLearningSlots, totalDurationDays };
}
