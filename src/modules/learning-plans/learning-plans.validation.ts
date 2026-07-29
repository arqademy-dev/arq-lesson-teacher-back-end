import { z } from 'zod';

const weekdayEnum = z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);

export const createLearningPlanSchema = z.object({
  studentId: z.string().uuid(),
  sessionsPerWeek: z.number().int().min(1).max(7),
  preferredDays: z.array(weekdayEnum).min(1),
  startDate: z.string().refine((v) => !isNaN(Date.parse(v)), 'Invalid date'),
  topics: z
    .array(
      z.object({
        topicId: z.string().uuid(),
        customDurationDays: z.number().int().positive().optional(),
      })
    )
    .min(1),
});