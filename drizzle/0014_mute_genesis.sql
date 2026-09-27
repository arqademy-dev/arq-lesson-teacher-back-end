ALTER TABLE "learning_plans" ADD COLUMN "quiz_duration_minutes" integer;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "weekly_quizzes" ADD COLUMN "duration_minutes" integer;--> statement-breakpoint
ALTER TABLE "weekly_quizzes" ADD COLUMN "started_at" timestamp;