CREATE TYPE "public"."account_approval" AS ENUM('approve', 'pending', 'closed', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'student', 'educator', 'parent');--> statement-breakpoint
CREATE TABLE "educator_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"arq_id" text NOT NULL,
	"account_approval" "account_approval" DEFAULT 'pending' NOT NULL,
	"user_id" serial NOT NULL,
	CONSTRAINT "educator_profiles_email_unique" UNIQUE("email"),
	CONSTRAINT "educator_profiles_arq_id_unique" UNIQUE("arq_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"password" text NOT NULL,
	"role" "user_role" DEFAULT 'educator' NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"arq_id" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_arq_id_unique" UNIQUE("arq_id")
);
--> statement-breakpoint
ALTER TABLE "educator_profiles" ADD CONSTRAINT "educator_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;