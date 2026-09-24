import { z } from 'zod';

export const uuidSchema = z.string().uuid();

// Two shapes depending on the question's type — the client already knows which,
// since it just fetched the question list.
export const saveAnswerSchema = z.union([
  z.object({ selectedIndex: z.number().int().min(0) }),
  z.object({ answerText: z.string().trim().min(1).max(500) }),
]);

export type SaveAnswerBody = z.infer<typeof saveAnswerSchema>;