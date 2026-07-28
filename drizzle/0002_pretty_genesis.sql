CREATE TYPE "public"."interaction_type" AS ENUM('drag_and_drop', 'fill_blank', 'hotspot', 'branching', 'interactive_video', 'image_sequencing');--> statement-breakpoint
CREATE TYPE "public"."learning_plan_status" AS ENUM('active', 'completed', 'paused', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'success', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."resource_type" AS ENUM('video', 'pdf', 'article', 'image', 'interactive');--> statement-breakpoint
CREATE TYPE "public"."topic_status" AS ENUM('pending', 'in_progress', 'completed');--> statement-breakpoint
CREATE TABLE "classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_id" uuid NOT NULL,
	"title" varchar(100) NOT NULL,
	"term" varchar(50),
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "educators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"arq_id" text NOT NULL,
	"account_approval" "account_approval" DEFAULT 'pending' NOT NULL,
	"specialization" varchar(100),
	"bio" text,
	"hired_date" date,
	"user_id" uuid NOT NULL,
	CONSTRAINT "educators_email_unique" UNIQUE("email"),
	CONSTRAINT "educators_arq_id_unique" UNIQUE("arq_id"),
	CONSTRAINT "educators_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "interactive_elements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_id" uuid NOT NULL,
	"interaction_type" "interaction_type" NOT NULL,
	"video_timestamp_seconds" integer,
	"pause_on_trigger" boolean DEFAULT true NOT NULL,
	"config_schema" jsonb NOT NULL,
	"correct_answers" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_plan_topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learning_plan_id" uuid NOT NULL,
	"topic_id" uuid NOT NULL,
	"sequence_order" integer NOT NULL,
	"custom_duration_days" integer,
	"status" "topic_status" DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"educator_id" uuid NOT NULL,
	"sessions_per_week" integer NOT NULL,
	"preferred_days" text[] NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"status" "learning_plan_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"learning_plan_id" uuid NOT NULL,
	"pricing_tier_id" uuid NOT NULL,
	"amount_naira" integer NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"provider" varchar(50),
	"provider_reference" text,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_tiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"min_topics" integer NOT NULL,
	"max_topics" integer,
	"price_naira" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_id" uuid NOT NULL,
	"title" varchar(100) NOT NULL,
	"resource_type" "resource_type" NOT NULL,
	"url_or_path" text NOT NULL,
	"day_number" integer NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learning_plan_topic_id" uuid NOT NULL,
	"scheduled_date" date NOT NULL,
	"session_day_number" integer NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"educator_notes" text
);
--> statement-breakpoint
CREATE TABLE "student_interaction_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"interactive_element_id" uuid NOT NULL,
	"scheduled_session_id" uuid NOT NULL,
	"student_response" jsonb NOT NULL,
	"is_correct" boolean NOT NULL,
	"score_awarded" integer DEFAULT 0 NOT NULL,
	"time_spent_seconds" integer,
	"submitted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"educator_id" uuid NOT NULL,
	"enrollment_date" date DEFAULT now() NOT NULL,
	"academic_level" varchar(50),
	CONSTRAINT "students_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(100) NOT NULL,
	"description" text,
	"created_by_admin_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"title" varchar(100) NOT NULL,
	"description" text,
	"sort_order" integer NOT NULL,
	"expected_duration_days" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "educator" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "educator" CASCADE;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "educators" ADD CONSTRAINT "educators_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactive_elements" ADD CONSTRAINT "interactive_elements_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_plan_topics" ADD CONSTRAINT "learning_plan_topics_learning_plan_id_learning_plans_id_fk" FOREIGN KEY ("learning_plan_id") REFERENCES "public"."learning_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_plan_topics" ADD CONSTRAINT "learning_plan_topics_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_plans" ADD CONSTRAINT "learning_plans_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_plans" ADD CONSTRAINT "learning_plans_educator_id_educators_id_fk" FOREIGN KEY ("educator_id") REFERENCES "public"."educators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_learning_plan_id_learning_plans_id_fk" FOREIGN KEY ("learning_plan_id") REFERENCES "public"."learning_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_pricing_tier_id_pricing_tiers_id_fk" FOREIGN KEY ("pricing_tier_id") REFERENCES "public"."pricing_tiers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_sessions" ADD CONSTRAINT "scheduled_sessions_learning_plan_topic_id_learning_plan_topics_id_fk" FOREIGN KEY ("learning_plan_topic_id") REFERENCES "public"."learning_plan_topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_interaction_logs" ADD CONSTRAINT "student_interaction_logs_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_interaction_logs" ADD CONSTRAINT "student_interaction_logs_interactive_element_id_interactive_elements_id_fk" FOREIGN KEY ("interactive_element_id") REFERENCES "public"."interactive_elements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_interaction_logs" ADD CONSTRAINT "student_interaction_logs_scheduled_session_id_scheduled_sessions_id_fk" FOREIGN KEY ("scheduled_session_id") REFERENCES "public"."scheduled_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_educator_id_educators_id_fk" FOREIGN KEY ("educator_id") REFERENCES "public"."educators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_created_by_admin_id_users_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topics_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;