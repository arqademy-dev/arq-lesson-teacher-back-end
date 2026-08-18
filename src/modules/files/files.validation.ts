import { z } from 'zod';

export const presignedUrlSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().min(1), // e.g. 'image/png', 'application/pdf'
  folder: z.enum(['articles', 'interactive-elements', 'resources', 'misc']).default('misc'),
});

export const studentPresignedUrlSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().min(1),
});