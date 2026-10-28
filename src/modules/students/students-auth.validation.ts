import { z } from 'zod';

export const studentLoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});
export const forgotPasswordSchema = z.object({ email: z.string().email() });
export const resetPasswordSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(8).max(72),
});
export const otpConfirmSchema = z.object({
  otp: z.string().regex(/^\d{6}$/),
  password: z.string().min(8).max(72),
});