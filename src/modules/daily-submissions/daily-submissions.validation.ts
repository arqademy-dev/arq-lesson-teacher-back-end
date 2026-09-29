import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const listDailySubmissionsQuerySchema = z.object({
  learningPlanId: z.string().uuid().optional(),
  topicId: z.string().uuid().optional(),
  from: z.string().regex(dateRegex, 'from must be YYYY-MM-DD').optional(),
  to: z.string().regex(dateRegex, 'to must be YYYY-MM-DD').optional(),
});
export type ListDailySubmissionsQuery = z.infer<typeof listDailySubmissionsQuerySchema>;

export const saveNoteSchema = z.object({
  summaryNote: z.string().max(5000),
});
export type SaveNoteBody = z.infer<typeof saveNoteSchema>;

export const addFilesSchema = z.object({
  files: z
    .array(
      z.object({
        fileUrl: z.string().url(),
        fileKey: z.string().max(500).optional(),
        fileName: z.string().min(1).max(255),
        contentType: z.string().max(100).optional(),
        sizeBytes: z.number().int().nonnegative().optional(),
      })
    )
    .min(1)
    .max(10),
});
export type AddFilesBody = z.infer<typeof addFilesSchema>;