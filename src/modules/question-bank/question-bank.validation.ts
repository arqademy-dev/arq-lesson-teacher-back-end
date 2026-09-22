import { z } from 'zod';

export const uuidSchema = z.string().uuid();

const optionText = z.string().trim().min(1).max(500);
const answerText = z.string().trim().min(1).max(200);

// ------------------------------------------------------------
// Create: the shape required depends on `type`.
// ------------------------------------------------------------
const multipleChoiceCreate = z.object({
  type: z.literal('multiple_choice'),
  topicId: z.string().uuid(),
  text: z.string().trim().min(1).max(2000),
  options: z.array(optionText).min(2).max(6),
  correctIndex: z.number().int().min(0),
  feedback: z.string().trim().max(2000).optional(),
});

const fillBlankCreate = z.object({
  type: z.literal('fill_blank'),
  topicId: z.string().uuid(),
  text: z.string().trim().min(1).max(2000), // put ___ where the blank goes, e.g. "The powerhouse of the cell is the ___."
  // Every phrasing that counts as correct — matched case-insensitively after trimming.
  acceptedAnswers: z.array(answerText).min(1).max(10),
  feedback: z.string().trim().max(2000).optional(),
});

export const createQuestionSchema = z
  .discriminatedUnion('type', [multipleChoiceCreate, fillBlankCreate])
  .refine(
    (d) => d.type !== 'multiple_choice' || d.correctIndex < d.options.length,
    { message: 'correctIndex must point at one of the options', path: ['correctIndex'] }
  );

// Up to 200 at once (CSV / JSON import). Any invalid item rejects the whole request.
export const bulkCreateQuestionsSchema = z.object({
  questions: z.array(createQuestionSchema).min(1).max(200),
});

// ------------------------------------------------------------
// Update: every field optional, but internally consistent.
// `type` cannot change on an existing question — archive it and create a new one instead,
// since a multiple_choice question and a fill_blank question don't share an answer shape.
// ------------------------------------------------------------
export const updateQuestionSchema = z
  .object({
    topicId: z.string().uuid().optional(), // send a different topic to move the question
    text: z.string().trim().min(1).max(2000).optional(),
    options: z.array(optionText).min(2).max(6).optional(),
    correctIndex: z.number().int().min(0).optional(),
    acceptedAnswers: z.array(answerText).min(1).max(10).optional(),
    feedback: z.string().trim().max(2000).nullable().optional(),
    isActive: z.boolean().optional(), // false archives, true restores
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Nothing to update' })
  // Editing the options can shift which one is right, so the two always travel together.
  .refine((d) => (d.options === undefined) === (d.correctIndex === undefined), {
    message: 'Send options and correctIndex together',
    path: ['correctIndex'],
  })
  .refine((d) => d.options === undefined || d.correctIndex! < d.options.length, {
    message: 'correctIndex must point at one of the options',
    path: ['correctIndex'],
  });

export const listQuestionsQuerySchema = z.object({
  subjectId: z.string().uuid().optional(),
  topicId: z.string().uuid().optional(),
  type: z.enum(['multiple_choice', 'fill_blank']).optional(),
  search: z.string().trim().min(1).optional(),
  // z.coerce.boolean() treats the string "false" as true, so parse it by hand.
  includeInactive: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const coverageQuerySchema = z.object({
  programmeId: z.string().uuid(),
});

export type CreateQuestionBody = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionBody = z.infer<typeof updateQuestionSchema>;