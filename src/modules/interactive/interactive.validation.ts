import { z } from 'zod';

export const createInteractiveElementSchema = z.object({
  interactionType: z.enum([
    'drag_and_drop', 'fill_blank', 'hotspot', 'branching',
    'interactive_video', 'image_sequencing', 'multiple_choice',
  ]),
  videoTimestampSeconds: z.number().int().nonnegative().optional(),
  pauseOnTrigger: z.boolean().optional(),
  configSchema: z.record(z.any()),
  correctAnswers: z.record(z.any()),
});
export const updateInteractiveElementSchema = createInteractiveElementSchema.partial();