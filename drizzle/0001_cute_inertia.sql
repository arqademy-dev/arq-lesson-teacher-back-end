CREATE TABLE "educator" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"arq_id" text NOT NULL,
	"account_approval" "account_approval" DEFAULT 'pending' NOT NULL,
	"user_id" serial NOT NULL,
	CONSTRAINT "educator_email_unique" UNIQUE("email"),
	CONSTRAINT "educator_arq_id_unique" UNIQUE("arq_id")
);
--> statement-breakpoint
DROP TABLE "educator_profiles" CASCADE;--> statement-breakpoint
ALTER TABLE "educator" ADD CONSTRAINT "educator_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;