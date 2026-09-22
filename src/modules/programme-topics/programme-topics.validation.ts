import { z } from 'zod';

export const uuidSchema = z.string().uuid();

// Two shapes, tried in order:
//   1) { topicId }                                   -> attach a topic that already exists in the pool
//   2) { subjectId, title, description?, ... }       -> create a brand-new topic, then attach it
export const addProgrammeTopicSchema = z.union([
  z.object({ topicId: z.string().uuid() }),
  z.object({
    subjectId: z.string().uuid(),
    title: z.string().trim().min(1).max(100),
    description: z.string().trim().optional(),
    expectedDurationDays: z.number().int().min(1).max(30).optional(), // defaults to 1
  }),
]);

export const reorderTopicsSchema = z.object({
  topicIds: z.array(z.string().uuid()).min(1).max(100),
});

export const availableTopicsQuerySchema = z.object({
  subjectId: z.string().uuid().optional(),
});

export type AddProgrammeTopicBody = z.infer<typeof addProgrammeTopicSchema>;
export type ReorderTopicsBody = z.infer<typeof reorderTopicsSchema>;