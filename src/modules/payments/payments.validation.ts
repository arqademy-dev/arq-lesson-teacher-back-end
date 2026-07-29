import { z } from 'zod';

export const initiatePaymentSchema = z.object({
  learningPlanId: z.string().uuid(),
});