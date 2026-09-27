CREATE TABLE "daily_submission_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"daily_submission_id" uuid NOT NULL,
	"file_url" text NOT NULL,
	"file_key" text,
	"file_name" varchar(255) NOT NULL,
	"content_type" varchar(100),
	"size_bytes" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_submission_topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"daily_submission_id" uuid NOT NULL,
	"learning_plan_topic_id" uuid NOT NULL,
	CONSTRAINT "daily_submission_topics_unique" UNIQUE("daily_submission_id","learning_plan_topic_id")
);
--> statement-breakpoint
CREATE TABLE "daily_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learning_plan_id" uuid NOT NULL,
	"for_date" date NOT NULL,
	"summary_note" text,
	"submitted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "daily_submissions_plan_date_unique" UNIQUE("learning_plan_id","for_date")
);
--> statement-breakpoint
ALTER TABLE "student_interaction_logs" ADD COLUMN "question_id" uuid;--> statement-breakpoint
ALTER TABLE "daily_submission_files" ADD CONSTRAINT "daily_submission_files_daily_submission_id_daily_submissions_id_fk" FOREIGN KEY ("daily_submission_id") REFERENCES "public"."daily_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_submission_topics" ADD CONSTRAINT "daily_submission_topics_daily_submission_id_daily_submissions_id_fk" FOREIGN KEY ("daily_submission_id") REFERENCES "public"."daily_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_submission_topics" ADD CONSTRAINT "daily_submission_topics_learning_plan_topic_id_learning_plan_topics_id_fk" FOREIGN KEY ("learning_plan_topic_id") REFERENCES "public"."learning_plan_topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_submissions" ADD CONSTRAINT "daily_submissions_learning_plan_id_learning_plans_id_fk" FOREIGN KEY ("learning_plan_id") REFERENCES "public"."learning_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "daily_submission_files_submission_idx" ON "daily_submission_files" USING btree ("daily_submission_id");--> statement-breakpoint
ALTER TABLE "student_interaction_logs" ADD CONSTRAINT "student_interaction_logs_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE set null ON UPDATE no action;