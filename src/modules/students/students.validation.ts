import { z } from 'zod';

const guardianSchema = z.object({
  fullName: z.string().trim().min(1).max(100),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().email().optional(),
  relationship: z.string().trim().max(30).optional(),
});

const enrollStudentBase = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(), // the login email: the student's own or a parent/guardian's
  classId: z.string().uuid().optional(), // was required; optional now so programme students don't need a class
  programId: z.string().uuid().optional(), // NEW
  academicLevel: z.string().max(50).optional(),
  phone: z.string().trim().max(30).optional(), // NEW
  password: z.string().min(6).optional(),
  guardian: guardianSchema.optional(), // NEW
});

// A student must be placed in a class OR a programme (or both).
const hasPlacement = (d: { classId?: string; programId?: string }) => !!(d.classId || d.programId);
const placementError = { message: 'Provide a classId or a programId', path: ['programId'] };

// Educator route. Every request that was valid before is still valid.
export const enrollStudentSchema = enrollStudentBase.refine(hasPlacement, placementError);

// Admin route: same, plus an optional educator to assign right away.
export const adminEnrollStudentSchema = enrollStudentBase
  .extend({ educatorId: z.string().uuid().optional() })
  .refine(hasPlacement, placementError);

export const updateStudentSchema = z
  .object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    email: z.string().email().optional(),
    academicLevel: z.string().max(50).nullable().optional(),
    phone: z.string().trim().max(30).nullable().optional(),
    classId: z.string().uuid().nullable().optional(),
    programId: z.string().uuid().nullable().optional(),
    educatorId: z.string().uuid().nullable().optional(),
    active: z.boolean().optional(),
    guardian: guardianSchema.optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Nothing to update' });

export const listStudentsQuerySchema = z.object({
  programId: z.string().uuid().optional(),
  educatorId: z.string().uuid().optional(),
  search: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type AdminEnrollStudentBody = z.infer<typeof adminEnrollStudentSchema>;
export type UpdateStudentBody = z.infer<typeof updateStudentSchema>;