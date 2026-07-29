import { z } from 'zod';

export const studentLoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});