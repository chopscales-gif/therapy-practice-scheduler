CREATE TABLE "handoffs" (
	"token" text PRIMARY KEY NOT NULL,
	"sandbox_id" text NOT NULL,
	"path" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sandboxes" ADD COLUMN "practice_name" text;--> statement-breakpoint
ALTER TABLE "sandboxes" ADD COLUMN "revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "handoffs" ADD CONSTRAINT "handoffs_sandbox_id_sandboxes_id_fk" FOREIGN KEY ("sandbox_id") REFERENCES "public"."sandboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "handoffs_sandbox" ON "handoffs" USING btree ("sandbox_id");