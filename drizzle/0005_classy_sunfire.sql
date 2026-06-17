CREATE TABLE "email_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"alias" text NOT NULL,
	"email" text NOT NULL,
	"label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_aliases" ADD CONSTRAINT "email_aliases_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "email_aliases_user_alias_unique" ON "email_aliases" USING btree ("user_id","alias");--> statement-breakpoint
CREATE INDEX "email_aliases_user_id_idx" ON "email_aliases" USING btree ("user_id");