CREATE TYPE "public"."programme_status" AS ENUM('draft', 'published', 'locked');--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('multiple_choice', 'fill_blank');--> statement-breakpoint
CREATE TABLE "guardians" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"phone" varchar(30),
	"email" text,
	"relationship" varchar(30),
	"is_primary" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "programme_topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"programme_id" uuid NOT NULL,
	"topic_id" uuid NOT NULL,
	"sequence_order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "programme_topics_programme_topic_unique" UNIQUE("programme_id","topic_id")
);
--> statement-breakpoint
CREATE TABLE "programmes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(100) NOT NULL,
	"description" text,
	"subtitle" varchar(150),
	"status" "programme_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_id" uuid NOT NULL,
	"type" "question_type" DEFAULT 'multiple_choice' NOT NULL,
	"text" text NOT NULL,
	"options" jsonb,
	"correct_index" integer,
	"accepted_answers" jsonb,
	"feedback" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "learning_plans" ALTER COLUMN "educator_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "resources" ALTER COLUMN "topic_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ALTER COLUMN "educator_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "subjects" ALTER COLUMN "created_by_admin_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "topics" ALTER COLUMN "subject_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "topics" ALTER COLUMN "class_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "topics" ALTER COLUMN "sort_order" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN "program_id" uuid;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "program_id" uuid;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "phone" varchar(30);--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN "programme_id" uuid;--> statement-breakpoint
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programme_topics" ADD CONSTRAINT "programme_topics_programme_id_programmes_id_fk" FOREIGN KEY ("programme_id") REFERENCES "public"."programmes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programme_topics" ADD CONSTRAINT "programme_topics_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "questions_topic_idx" ON "questions" USING btree ("topic_id");--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_program_id_programmes_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programmes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_program_id_programmes_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programmes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topics_programme_id_programmes_id_fk" FOREIGN KEY ("programme_id") REFERENCES "public"."programmes"("id") ON DELETE set null ON UPDATE no action;