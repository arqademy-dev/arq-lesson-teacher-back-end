import { z } from 'zod';

export const uuidSchema = z.string().uuid();

export const createProgrammePlanSchema = z.object({
  programmeId: z.string().uuid(),
  weeks: z.number().int().min(1).max(12),
  quizDay: z.enum(['friday', 'saturday']),
  quizSize: z.number().int().min(1).max(200),
  // Minutes the student gets to complete each weekly quiz. Omit for untimed.
  quizDurationMinutes: z.number().int().min(1).max(240).optional(), // NEW
  // Must be a Monday (validated in the service, where "Monday" can be checked against the real calendar).
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be YYYY-MM-DD'),
  requireCorrectAnswersToProgress: z.boolean().optional(),
});

export type CreateProgrammePlanBody = z.infer<typeof createProgrammePlanSchema>;

// Deliberately narrow — weeks/quizDay/quizSize are NOT editable here (see service.update).
export const updateProgrammePlanSchema = z
  .object({
    requireCorrectAnswersToProgress: z.boolean().optional(),
    status: z.enum(['active', 'completed', 'paused', 'cancelled']).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Nothing to update' });

export type UpdateProgrammePlanBody = z.infer<typeof updateProgrammePlanSchema>;