CREATE TABLE "appointments" (
	"id" text PRIMARY KEY NOT NULL,
	"sandbox_id" text NOT NULL,
	"therapist_id" text NOT NULL,
	"client_id" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"mode" text NOT NULL,
	"status" text DEFAULT 'booked' NOT NULL,
	"source" text NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"cancelled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" text PRIMARY KEY NOT NULL,
	"sandbox_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"contact_by" text DEFAULT 'text' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" text PRIMARY KEY NOT NULL,
	"sandbox_id" text NOT NULL,
	"opening_id" text NOT NULL,
	"entry_id" text NOT NULL,
	"client_id" text NOT NULL,
	"token" text NOT NULL,
	"sent_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'sent' NOT NULL,
	"responded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "opening_events" (
	"id" text PRIMARY KEY NOT NULL,
	"sandbox_id" text NOT NULL,
	"opening_id" text NOT NULL,
	"at" timestamp with time zone NOT NULL,
	"n" serial NOT NULL,
	"tone" text DEFAULT 'neutral' NOT NULL,
	"text" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "openings" (
	"id" text PRIMARY KEY NOT NULL,
	"sandbox_id" text NOT NULL,
	"therapist_id" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"cancelled_appointment_id" text NOT NULL,
	"opened_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'offering' NOT NULL,
	"filled_appointment_id" text,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "outbox_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"sandbox_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"n" serial NOT NULL,
	"channel" text NOT NULL,
	"kind" text NOT NULL,
	"recipient_name" text NOT NULL,
	"recipient" text NOT NULL,
	"subject" text,
	"body" text NOT NULL,
	"link" text
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" text PRIMARY KEY NOT NULL,
	"sandbox_id" text NOT NULL,
	"appointment_id" text NOT NULL,
	"hours_before" integer NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sandboxes" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"clock_at" timestamp with time zone NOT NULL,
	"clock_start_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "therapists" (
	"id" text PRIMARY KEY NOT NULL,
	"sandbox_id" text NOT NULL,
	"position" integer NOT NULL,
	"name" text NOT NULL,
	"credentials" text NOT NULL,
	"focus" text NOT NULL,
	"offers_video" boolean NOT NULL,
	"hours" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "waitlist_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"sandbox_id" text NOT NULL,
	"client_id" text NOT NULL,
	"therapist_id" text,
	"days" jsonb NOT NULL,
	"parts" jsonb NOT NULL,
	"mode" text NOT NULL,
	"joined_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'waiting' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_sandbox_id_sandboxes_id_fk" FOREIGN KEY ("sandbox_id") REFERENCES "public"."sandboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_therapist_id_therapists_id_fk" FOREIGN KEY ("therapist_id") REFERENCES "public"."therapists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_sandbox_id_sandboxes_id_fk" FOREIGN KEY ("sandbox_id") REFERENCES "public"."sandboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_sandbox_id_sandboxes_id_fk" FOREIGN KEY ("sandbox_id") REFERENCES "public"."sandboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_opening_id_openings_id_fk" FOREIGN KEY ("opening_id") REFERENCES "public"."openings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_entry_id_waitlist_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."waitlist_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opening_events" ADD CONSTRAINT "opening_events_sandbox_id_sandboxes_id_fk" FOREIGN KEY ("sandbox_id") REFERENCES "public"."sandboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opening_events" ADD CONSTRAINT "opening_events_opening_id_openings_id_fk" FOREIGN KEY ("opening_id") REFERENCES "public"."openings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "openings" ADD CONSTRAINT "openings_sandbox_id_sandboxes_id_fk" FOREIGN KEY ("sandbox_id") REFERENCES "public"."sandboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "openings" ADD CONSTRAINT "openings_therapist_id_therapists_id_fk" FOREIGN KEY ("therapist_id") REFERENCES "public"."therapists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "openings" ADD CONSTRAINT "openings_cancelled_appointment_id_appointments_id_fk" FOREIGN KEY ("cancelled_appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "openings" ADD CONSTRAINT "openings_filled_appointment_id_appointments_id_fk" FOREIGN KEY ("filled_appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbox_messages" ADD CONSTRAINT "outbox_messages_sandbox_id_sandboxes_id_fk" FOREIGN KEY ("sandbox_id") REFERENCES "public"."sandboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_sandbox_id_sandboxes_id_fk" FOREIGN KEY ("sandbox_id") REFERENCES "public"."sandboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "therapists" ADD CONSTRAINT "therapists_sandbox_id_sandboxes_id_fk" FOREIGN KEY ("sandbox_id") REFERENCES "public"."sandboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_sandbox_id_sandboxes_id_fk" FOREIGN KEY ("sandbox_id") REFERENCES "public"."sandboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_therapist_id_therapists_id_fk" FOREIGN KEY ("therapist_id") REFERENCES "public"."therapists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appointments_sandbox_start" ON "appointments" USING btree ("sandbox_id","starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "appointments_token" ON "appointments" USING btree ("token");--> statement-breakpoint
CREATE INDEX "appointments_therapist" ON "appointments" USING btree ("therapist_id");--> statement-breakpoint
CREATE INDEX "appointments_client" ON "appointments" USING btree ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "appointments_one_per_slot" ON "appointments" USING btree ("sandbox_id","therapist_id","starts_at") WHERE status <> 'cancelled';--> statement-breakpoint
CREATE UNIQUE INDEX "clients_sandbox_email" ON "clients" USING btree ("sandbox_id","email");--> statement-breakpoint
CREATE INDEX "offers_sandbox" ON "offers" USING btree ("sandbox_id");--> statement-breakpoint
CREATE INDEX "offers_opening" ON "offers" USING btree ("opening_id");--> statement-breakpoint
CREATE INDEX "offers_entry" ON "offers" USING btree ("entry_id");--> statement-breakpoint
CREATE INDEX "offers_client" ON "offers" USING btree ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "offers_token" ON "offers" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "offers_one_live_per_opening" ON "offers" USING btree ("opening_id") WHERE status = 'sent';--> statement-breakpoint
CREATE INDEX "opening_events_opening" ON "opening_events" USING btree ("opening_id");--> statement-breakpoint
CREATE INDEX "opening_events_sandbox" ON "opening_events" USING btree ("sandbox_id");--> statement-breakpoint
CREATE INDEX "openings_sandbox" ON "openings" USING btree ("sandbox_id");--> statement-breakpoint
CREATE INDEX "openings_therapist" ON "openings" USING btree ("therapist_id");--> statement-breakpoint
CREATE INDEX "openings_cancelled" ON "openings" USING btree ("cancelled_appointment_id");--> statement-breakpoint
CREATE INDEX "openings_filled" ON "openings" USING btree ("filled_appointment_id");--> statement-breakpoint
CREATE INDEX "outbox_sandbox" ON "outbox_messages" USING btree ("sandbox_id","created_at");--> statement-breakpoint
CREATE INDEX "reminders_sandbox_due" ON "reminders" USING btree ("sandbox_id","due_at");--> statement-breakpoint
CREATE INDEX "reminders_appointment" ON "reminders" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "therapists_sandbox" ON "therapists" USING btree ("sandbox_id");--> statement-breakpoint
CREATE INDEX "waitlist_sandbox" ON "waitlist_entries" USING btree ("sandbox_id");--> statement-breakpoint
CREATE INDEX "waitlist_client" ON "waitlist_entries" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "waitlist_therapist" ON "waitlist_entries" USING btree ("therapist_id");