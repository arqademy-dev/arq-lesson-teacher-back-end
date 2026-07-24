import { z } from 'zod';

export const registerUserBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

export const loginUserBodySchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export type RegisterUserInput = z.infer<typeof registerUserBodySchema>;
export type LoginUserInput = z.infer<typeof loginUserBodySchema>;