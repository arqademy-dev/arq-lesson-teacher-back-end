ALTER TABLE "classes" DROP CONSTRAINT "classes_subject_id_subjects_id_fk";
--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN "subject_id" uuid;--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topics_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" DROP COLUMN "subject_id";