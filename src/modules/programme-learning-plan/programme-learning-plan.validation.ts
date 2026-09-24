import { z } from 'zod';

export const uuidSchema = z.string().uuid();

export const createProgrammePlanSchema = z.object({
  programmeId: z.string().uuid(),
  weeks: z.number().int().min(1).max(12),
  quizDay: z.enum(['friday', 'saturday']),
  quizSize: z.number().int().min(1).max(200),
  // Must be a Monday (validated in the service, where "Monday" can be checked against the real calendar).
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be YYYY-MM-DD'),
  requireCorrectAnswersToProgress: z.boolean().optional(),
});

export type CreateProgrammePlanBody = z.infer<typeof createProgrammePlanSchema>;