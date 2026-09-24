import { z } from 'zod';

// One section of a topic's summary format: a header + a body, rendered by the frontend.
// A topic can have as many sections as needed — this is the whole point of the array.
export const summarySectionSchema = z.object({
  header: z.string().trim().min(1).max(150),
  body: z.string().trim().min(1).max(5000),
});

// Send `[]` or omit to leave unset; send `null` (where the field allows it) to clear it.
export const summaryFormatSchema = z.array(summarySectionSchema).min(1).max(20);

export type SummarySection = z.infer<typeof summarySectionSchema>;
export type SummaryFormat = SummarySection[];