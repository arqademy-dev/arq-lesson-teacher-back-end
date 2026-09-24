CREATE TYPE "public"."quiz_day" AS ENUM('friday', 'saturday');--> statement-breakpoint
CREATE TYPE "public"."weekly_quiz_status" AS ENUM('pending', 'submitted');--> statement-breakpoint
CREATE TABLE "programme_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"programme_id" uuid NOT NULL,
	"label" varchar(100),
	"price_naira" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weekly_quiz_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"weekly_quiz_question_id" uuid NOT NULL,
	"student_response" jsonb NOT NULL,
	"is_correct" boolean,
	"score_awarded" integer DEFAULT 0 NOT NULL,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "weekly_quiz_answers_question_unique" UNIQUE("weekly_quiz_question_id")
);
--> statement-breakpoint
CREATE TABLE "weekly_quiz_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"weekly_quiz_id" uuid NOT NULL,
	"question_id" uuid,
	"order_index" integer NOT NULL,
	"type" "question_type" NOT NULL,
	"text" text NOT NULL,
	"options" jsonb,
	"correct_index" integer,
	"accepted_answers" jsonb,
	"feedback" text
);
--> statement-breakpoint
CREATE TABLE "weekly_quizzes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learning_plan_id" uuid NOT NULL,
	"week_number" integer NOT NULL,
	"scheduled_date" date NOT NULL,
	"requested_size" integer NOT NULL,
	"topic_ids" jsonb NOT NULL,
	"status" "weekly_quiz_status" DEFAULT 'pending' NOT NULL,
	"score" integer,
	"submitted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "learning_plans" ALTER COLUMN "sessions_per_week" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "learning_plans" ALTER COLUMN "preferred_days" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "pricing_tier_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "learning_plans" ADD COLUMN "programme_id" uuid;--> statement-breakpoint
ALTER TABLE "learning_plans" ADD COLUMN "weeks" integer;--> statement-breakpoint
ALTER TABLE "learning_plans" ADD COLUMN "quiz_day" "quiz_day";--> statement-breakpoint
ALTER TABLE "learning_plans" ADD COLUMN "quiz_size" integer;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "programme_price_id" uuid;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "gafia_account_number" varchar(100);--> statement-breakpoint
ALTER TABLE "programme_prices" ADD CONSTRAINT "programme_prices_programme_id_programmes_id_fk" FOREIGN KEY ("programme_id") REFERENCES "public"."programmes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_quiz_answers" ADD CONSTRAINT "weekly_quiz_answers_weekly_quiz_question_id_weekly_quiz_questions_id_fk" FOREIGN KEY ("weekly_quiz_question_id") REFERENCES "public"."weekly_quiz_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_quiz_questions" ADD CONSTRAINT "weekly_quiz_questions_weekly_quiz_id_weekly_quizzes_id_fk" FOREIGN KEY ("weekly_quiz_id") REFERENCES "public"."weekly_quizzes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_quiz_questions" ADD CONSTRAINT "weekly_quiz_questions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_quizzes" ADD CONSTRAINT "weekly_quizzes_learning_plan_id_learning_plans_id_fk" FOREIGN KEY ("learning_plan_id") REFERENCES "public"."learning_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_plans" ADD CONSTRAINT "learning_plans_programme_id_programmes_id_fk" FOREIGN KEY ("programme_id") REFERENCES "public"."programmes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_programme_price_id_programme_prices_id_fk" FOREIGN KEY ("programme_price_id") REFERENCES "public"."programme_prices"("id") ON DELETE no action ON UPDATE no action;