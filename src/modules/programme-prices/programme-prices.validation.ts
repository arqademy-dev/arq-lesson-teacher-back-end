import { z } from 'zod';

export const uuidSchema = z.string().uuid();

export const createProgrammePriceSchema = z.object({
  programmeId: z.string().uuid(),
  priceNaira: z.number().int().positive(),
  label: z.string().trim().max(100).optional(),
  isActive: z.boolean().optional().default(true),
});

export const updateProgrammePriceSchema = z
  .object({
    priceNaira: z.number().int().positive().optional(),
    label: z.string().trim().max(100).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Nothing to update' });

export type CreateProgrammePriceBody = z.infer<typeof createProgrammePriceSchema>;
export type UpdateProgrammePriceBody = z.infer<typeof updateProgrammePriceSchema>;