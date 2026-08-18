import { z } from 'zod';

export const createInteractiveElementSchema = z.object({
  interactionType: z.enum([
    'drag_and_drop', 'fill_blank', 'hotspot', 'branching',
    'interactive_video', 'image_sequencing', 'multiple_choice', 'file_upload',
  ]),
  videoTimestampSeconds: z.number().int().nonnegative().optional(),
  pauseOnTrigger: z.boolean().optional(),
  // Pass both key and value types explicitly
  configSchema: z.record(z.string(), z.any()),
  correctAnswers: z.record(z.string(), z.any()),
});

export const updateInteractiveElementSchema = createInteractiveElementSchema.partial();
