import { z } from 'zod';

export const headingBlockSchema = z.object({
  type: z.literal('heading'),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  text: z.string(),
});

export const paragraphBlockSchema = z.object({
  type: z.literal('paragraph'),
  text: z.string(),
});

export const imageBlockSchema = z.object({
  type: z.literal('image'),
  url: z.string().url(), // the R2 public URL from the upload flow above
  altText: z.string().optional(),
  caption: z.string().optional(),
});

export const fileBlockSchema = z.object({
  type: z.literal('file'),
  url: z.string().url(),
  fileName: z.string(),
  mimeType: z.string().optional(),
});

export const bulletListBlockSchema = z.object({
  type: z.literal('bullet_list'),
  items: z.array(z.string()).min(1),
});

export const contentBlockSchema = z.discriminatedUnion('type', [
  headingBlockSchema,
  paragraphBlockSchema,
  imageBlockSchema,
  fileBlockSchema,
  bulletListBlockSchema,
]);

export const contentBodySchema = z.array(contentBlockSchema);
export type ContentBlock = z.infer<typeof contentBlockSchema>;