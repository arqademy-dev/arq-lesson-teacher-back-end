import { pgTable, serial, text, timestamp, boolean, pgEnum, uuid, varchar, integer, date, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const roleEnum = pgEnum('user_role', ['admin', 'student', 'educator', 'parent']);
export const approvalEnum = pgEnum('account_approval', ['approve', 'pending', 'closed', 'suspended']);
export const resourceTypeEnum = pgEnum('resource_type', ['video', 'pdf', 'article', 'image', 'interactive', 'quiz']);
export const interactionTypeEnum = pgEnum('interaction_type', [
  'drag_and_drop',
  'fill_blank',
  'hotspot',
  'branching',
  'interactive_video',
  'image_sequencing',
  'multiple_choice'
]);
export const learningPlanStatusEnum = pgEnum('learning_plan_status', ['active', 'completed', 'paused', 'cancelled']);
export const topicStatusEnum = pgEnum('topic_status', ['pending', 'in_progress', 'completed']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'success', 'failed', 'refunded']);

// ==========================================
// 1. USER MANAGEMENT MODULE
// ==========================================

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
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

export const educators = pgTable('educators', {
  id: uuid('id').defaultRandom().primaryKey(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull().unique(),
  arqId: text('arq_id').notNull().unique(),
  accountApproval: approvalEnum('account_approval').default('pending').notNull(),
  specialization: varchar('specialization', { length: 100 }),
  bio: text('bio'),
  hiredDate: date('hired_date'),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
});

export const students = pgTable('students', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  educatorId: uuid('educator_id').references(() => educators.id).notNull(),
  enrollmentDate: date('enrollment_date').defaultNow().notNull(),
  academicLevel: varchar('academic_level', { length: 50 }),
});

// ==========================================
// 2. ADMIN-CREATED GLOBAL CURRICULUM CATALOG
// ==========================================

export const subjects = pgTable('subjects', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 100 }).notNull(),
  description: text('description'),
  createdByAdminId: uuid('created_by_admin_id').references(() => users.id).notNull(),
});

export const classes = pgTable('classes', {
  id: uuid('id').defaultRandom().primaryKey(),
  subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 100 }).notNull(),
  term: varchar('term', { length: 50 }),
  isActive: boolean('is_active').default(true).notNull(),
});

export const topics = pgTable('topics', {
  id: uuid('id').defaultRandom().primaryKey(),
  classId: uuid('class_id').references(() => classes.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 100 }).notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').notNull(),
  expectedDurationDays: integer('expected_duration_days').notNull(),
});

export const resources = pgTable('resources', {
  id: uuid('id').defaultRandom().primaryKey(),
  topicId: uuid('topic_id').references(() => topics.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 100 }).notNull(),
  resourceType: resourceTypeEnum('resource_type').notNull(),
  urlOrPath: text('url_or_path').notNull(),
  dayNumber: integer('day_number').notNull(),
  sortOrder: integer('sort_order').notNull(),
});

// ==========================================
// 3. INTERACTIVE MATERIAL ENGINE (JSON FIELDS)
// ==========================================

export const interactiveElements = pgTable('interactive_elements', {
  id: uuid('id').defaultRandom().primaryKey(),
  resourceId: uuid('resource_id').references(() => resources.id, { onDelete: 'cascade' }).notNull(),
  interactionType: interactionTypeEnum('interaction_type').notNull(),
  videoTimestampSeconds: integer('video_timestamp_seconds'),
  pauseOnTrigger: boolean('pause_on_trigger').default(true).notNull(),
  configSchema: jsonb('config_schema').$type<Record<string, any>>().notNull(),
  correctAnswers: jsonb('correct_answers').$type<Record<string, any>>().notNull(),
});

// ==========================================
// 4. DYNAMIC LEARNING PATH WORKFLOW ENGINE
// ==========================================

export const learningPlans = pgTable('learning_plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  studentId: uuid('student_id').references(() => students.id, { onDelete: 'cascade' }).notNull(),
  educatorId: uuid('educator_id').references(() => educators.id).notNull(),
  sessionsPerWeek: integer('sessions_per_week').notNull(),
  preferredDays: text('preferred_days').array().notNull(), // e.g. ['monday', 'wednesday', 'friday']
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  status: learningPlanStatusEnum('status').default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const learningPlanTopics = pgTable('learning_plan_topics', {
  id: uuid('id').defaultRandom().primaryKey(),
  learningPlanId: uuid('learning_plan_id').references(() => learningPlans.id, { onDelete: 'cascade' }).notNull(),
  topicId: uuid('topic_id').references(() => topics.id).notNull(),
  sequenceOrder: integer('sequence_order').notNull(),
  customDurationDays: integer('custom_duration_days'),
  status: topicStatusEnum('status').default('pending').notNull(),
});

export const scheduledSessions = pgTable('scheduled_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  learningPlanTopicId: uuid('learning_plan_topic_id').references(() => learningPlanTopics.id, { onDelete: 'cascade' }).notNull(),
  scheduledDate: date('scheduled_date').notNull(),
  sessionDayNumber: integer('session_day_number').notNull(),
  isCompleted: boolean('is_completed').default(false).notNull(),
  educatorNotes: text('educator_notes'),
});

// ==========================================
// 5. PRICING & PAYMENTS MODULE
// ==========================================

export const pricingTiers = pgTable('pricing_tiers', {
  id: uuid('id').defaultRandom().primaryKey(),
  minTopics: integer('min_topics').notNull(),
  maxTopics: integer('max_topics'), // null = no upper bound (open-ended top tier)
  priceNaira: integer('price_naira').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
});

export const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  studentId: uuid('student_id').references(() => students.id, { onDelete: 'cascade' }).notNull(),
  learningPlanId: uuid('learning_plan_id').references(() => learningPlans.id, { onDelete: 'cascade' }).notNull(),
  pricingTierId: uuid('pricing_tier_id').references(() => pricingTiers.id).notNull(),
  amountNaira: integer('amount_naira').notNull(),
  status: paymentStatusEnum('status').default('pending').notNull(),
  provider: varchar('provider', { length: 50 }), // e.g. 'paystack', 'flutterwave'
  providerReference: text('provider_reference'),
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==========================================
// 6. STUDENT TELEMETRY & SUBMISSION RUNTIME LOGS
// ==========================================

export const studentInteractionLogs = pgTable('student_interaction_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  studentId: uuid('student_id').references(() => students.id, { onDelete: 'cascade' }).notNull(),
  interactiveElementId: uuid('interactive_element_id').references(() => interactiveElements.id, { onDelete: 'cascade' }).notNull(),
  scheduledSessionId: uuid('scheduled_session_id').references(() => scheduledSessions.id).notNull(),
  studentResponse: jsonb('student_response').$type<Record<string, any>>().notNull(),
  isCorrect: boolean('is_correct').notNull(),
  scoreAwarded: integer('score_awarded').default(0).notNull(),
  timeSpentSeconds: integer('time_spent_seconds'),
  submittedAt: timestamp('submitted_at').defaultNow().notNull(),
});

// ==========================================
// 7. DRIZZLE RELATIONAL TYPE MAPS
// ==========================================

export const usersRelations = relations(users, ({ one }) => ({
  educatorProfile: one(educators, { fields: [users.id], references: [educators.userId] }),
  studentProfile: one(students, { fields: [users.id], references: [students.userId] }),
}));

export const resourcesRelations = relations(resources, ({ many }) => ({
  interactiveElements: many(interactiveElements),
}));

export const interactiveElementsRelations = relations(interactiveElements, ({ one, many }) => ({
  resource: one(resources, { fields: [interactiveElements.resourceId], references: [resources.id] }),
  telemetryLogs: many(studentInteractionLogs),
}));

export const learningPlansRelations = relations(learningPlans, ({ one, many }) => ({
  student: one(students, { fields: [learningPlans.studentId], references: [students.id] }),
  educator: one(educators, { fields: [learningPlans.educatorId], references: [educators.id] }),
  topics: many(learningPlanTopics),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  student: one(students, { fields: [payments.studentId], references: [students.id] }),
  learningPlan: one(learningPlans, { fields: [payments.learningPlanId], references: [learningPlans.id] }),
  pricingTier: one(pricingTiers, { fields: [payments.pricingTierId], references: [pricingTiers.id] }),
}));