// ------------------------------------------------------------------
// This is your curriculum.validation.ts with two changes, both scoped to topics:
//   1. subjectId and classId are now .optional() — provide either, both, or
//      neither; whatever you send is saved, whatever you omit stays null.
//   2. summaryFormat added — a flexible list of { header, body } sections
//      describing what the student's end-of-day summary should cover.
// Subjects, classes and resources are untouched. Diff before applying.
// ------------------------------------------------------------------

import { z } from 'zod';
import { contentBodySchema } from '../../shared/content-blocks.js';
import { summaryFormatSchema } from '../../shared/summary-format.js';

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
  subjectId: z.string().uuid().optional(), // CHANGED — optional: save it if it comes, leave null otherwise
  classId: z.string().uuid().optional(),   // CHANGED — same
  title: z.string().min(1).max(100),
  description: z.string().optional(),
  sortOrder: z.number().int().nonnegative(),
  expectedDurationDays: z.number().int().positive(),
  summaryFormat: summaryFormatSchema.optional(), // NEW
});
export const updateTopicSchema = createTopicSchema.partial();

export const createResourceSchema = z.object({
  title: z.string().min(1).max(100),
  resourceType: z.enum(['video', 'pdf', 'article', 'image', 'interactive', 'quiz', 'submission']),
  urlOrPath: z.string().min(1),
  dayNumber: z.number().int().positive(),
  sortOrder: z.number().int().nonnegative(),
  contentBody: contentBodySchema.optional(),
});

export const updateResourceSchema = createResourceSchema.partial();