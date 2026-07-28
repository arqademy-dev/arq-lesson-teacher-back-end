import { z } from 'zod';

export const createSubjectSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().optional(),
});
export const updateSubjectSchema = createSubjectSchema.partial();

export const createClassSchema = z.object({
  title: z.string().min(1).max(100),
  term: z.string().max(50).optional(),
  isActive: z.boolean().optional(),
});
export const updateClassSchema = createClassSchema.partial();

export const createTopicSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().optional(),
  sortOrder: z.number().int().nonnegative(),
  expectedDurationDays: z.number().int().positive(),
});
export const updateTopicSchema = createTopicSchema.partial();

export const createResourceSchema = z.object({
  title: z.string().min(1).max(100),
  resourceType: z.enum(['video', 'pdf', 'article', 'image', 'interactive', 'quiz']),
  urlOrPath: z.string().min(1),
  dayNumber: z.number().int().positive(),
  sortOrder: z.number().int().nonnegative(),
});
export const updateResourceSchema = createResourceSchema.partial();