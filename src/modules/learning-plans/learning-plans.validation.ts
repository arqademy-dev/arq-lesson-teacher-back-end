import { z } from 'zod';

const weekdayEnum = z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);

export const createLearningPlanSchema = z.object({
  studentId: z.string().uuid(),
  sessionsPerWeek: z.number().int().min(1).max(7),
  preferredDays: z.array(weekdayEnum).min(1),
  startDate: z.string().refine((v) => !isNaN(Date.parse(v)), 'Invalid date'),
  requireCorrectAnswersToProgress: z.boolean().optional().default(true), // NEW
  topics: z.array(z.object({ topicId: z.string().uuid(), customDurationDays: z.number().int().positive().optional() })).min(1),
});

export const updateLearningPlanSchema = z.object({
  sessionsPerWeek: z.number().int().min(1).max(7).optional(),
  preferredDays: z.array(weekdayEnum).min(1).optional(),
  startDate: z.string().refine((v) => !isNaN(Date.parse(v)), 'Invalid date').optional(),
  endDate: z.union([z.string().refine((v) => !isNaN(Date.parse(v)), 'Invalid date'), z.null()]).optional(),
  status: z.enum(['active', 'completed', 'paused', 'cancelled']).optional(),
  requireCorrectAnswersToProgress: z.boolean().optional(),
});

export const updateScheduledSessionSchema = z.object({
  scheduledDate: z.string().refine((v) => !isNaN(Date.parse(v)), 'Invalid date').optional(),
  sessionDayNumber: z.number().int().positive().optional(),
  isCompleted: z.boolean().optional(),
  educatorNotes: z.string().optional(),
});