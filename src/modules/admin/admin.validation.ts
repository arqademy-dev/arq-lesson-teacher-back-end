import { z } from 'zod';

export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const approvalActionSchema = z.object({
  action: z.enum(['approve', 'suspend', 'close']),
});