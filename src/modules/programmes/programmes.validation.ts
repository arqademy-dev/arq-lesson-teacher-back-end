import { z } from 'zod';

export const programmeStatusSchema = z.enum(['draft', 'published', 'locked']);

// New programmes always start as drafts. Publishing happens later, once topics exist.
export const createProgrammeSchema = z.object({
  title: z.string().trim().min(1).max(100),
  subtitle: z.string().trim().max(150).optional(),
  description: z.string().trim().optional(),
});

export const updateProgrammeSchema = z
  .object({
    title: z.string().trim().min(1).max(100).optional(),
    subtitle: z.string().trim().max(150).nullable().optional(),
    description: z.string().trim().nullable().optional(),
    status: programmeStatusSchema.optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Nothing to update' });

export const listProgrammesQuerySchema = z.object({
  status: programmeStatusSchema.optional(),
  search: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const uuidSchema = z.string().uuid();

export type ProgrammeStatus = z.infer<typeof programmeStatusSchema>;
export type CreateProgrammeBody = z.infer<typeof createProgrammeSchema>;
export type UpdateProgrammeBody = z.infer<typeof updateProgrammeSchema>;