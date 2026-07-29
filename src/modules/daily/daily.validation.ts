import { z } from 'zod';

export const submitInteractionSchema = z.object({
  interactiveElementId: z.string().uuid(),
  scheduledSessionId: z.string().uuid(),
  // Explicitly set string keys and generic values
  response: z.record(z.string(), z.any()),
});
