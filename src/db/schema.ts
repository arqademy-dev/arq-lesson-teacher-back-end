import { pgTable, serial, text, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('user_role', ['admin', 'student', 'educator', 'parent']);
export const approvalEnum = pgEnum('account_approval', ['approve', 'pending', 'closed', 'suspended']);

export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  password: text('password').notNull(),
  role: roleEnum('role').default('educator').notNull(),
  verified: boolean('verified').default(false).notNull(),
  arqId: text('arq_id').notNull().unique(),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const educatorProfilesTable = pgTable('educator_profiles', {
  id: serial('id').primaryKey(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull().unique(),
  arqId: text('arq_id').notNull().unique(),
  accountApproval: approvalEnum('account_approval').default('pending').notNull(),
  userId: serial('user_id').references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
});