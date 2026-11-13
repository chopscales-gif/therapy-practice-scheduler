import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type { ContactBy, Mode, ModePreference, PartOfDay } from "@/lib/practice";

/**
 * Every row belongs to a sandbox: one visitor's private copy of the demo data.
 * Deleting the sandbox row removes everything that visitor created. Every
 * foreign key has an index so that the cascade stays quick.
 */
export const sandboxes = pgTable("sandboxes", {
  id: text("id").primaryKey(),
  /** Real time, used only to purge old sandboxes. */
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  /** The demo clock: what time it is inside this sandbox. It only moves when the visitor skips ahead. */
  clockAt: timestamp("clock_at", { withTimezone: true }).notNull(),
  clockStartAt: timestamp("clock_start_at", { withTimezone: true }).notNull(),
});

const sandboxId = () =>
  text("sandbox_id")
    .notNull()
    .references(() => sandboxes.id, { onDelete: "cascade" });

const at = (name: string) => timestamp(name, { withTimezone: true });

export const therapists = pgTable(
  "therapists",
  {
    id: text("id").primaryKey(),
    sandboxId: sandboxId(),
    position: integer("position").notNull(),
    name: text("name").notNull(),
    credentials: text("credentials").notNull(),
    focus: text("focus").notNull(),
    offersVideo: boolean("offers_video").notNull(),
    /** Session start hours for each weekday (1 is Monday), in the practice's time zone. */
    hours: jsonb("hours").$type<Record<string, number[]>>().notNull(),
  },
  (t) => [index("therapists_sandbox").on(t.sandboxId)],
);

export const clients = pgTable(
  "clients",
  {
    id: text("id").primaryKey(),
    sandboxId: sandboxId(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    contactBy: text("contact_by").$type<ContactBy>().notNull().default("text"),
  },
  // One record per email address, so a returning client is recognised and never duplicated.
  (t) => [uniqueIndex("clients_sandbox_email").on(t.sandboxId, t.email)],
);

export type AppointmentStatus = "booked" | "confirmed" | "cancelled" | "completed";
export type AppointmentSource = "online" | "front_desk" | "waitlist";

export const appointments = pgTable(
  "appointments",
  {
    id: text("id").primaryKey(),
    sandboxId: sandboxId(),
    therapistId: text("therapist_id")
      .notNull()
      .references(() => therapists.id, { onDelete: "cascade" }),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    startsAt: at("starts_at").notNull(),
    mode: text("mode").$type<Mode>().notNull(),
    status: text("status").$type<AppointmentStatus>().notNull().default("booked"),
    source: text("source").$type<AppointmentSource>().notNull(),
    /** The secret in the client's manage link. */
    token: text("token").notNull(),
    createdAt: at("created_at").notNull(),
    cancelledAt: at("cancelled_at"),
  },
  (t) => [
    index("appointments_sandbox_start").on(t.sandboxId, t.startsAt),
    uniqueIndex("appointments_token").on(t.token),
    index("appointments_therapist").on(t.therapistId),
    index("appointments_client").on(t.clientId),
    // The database itself refuses a double booking, whatever the application code does.
    uniqueIndex("appointments_one_per_slot").on(t.sandboxId, t.therapistId, t.startsAt).where(sql`status <> 'cancelled'`),
  ],
);

export type WaitlistStatus = "waiting" | "placed" | "removed";

export const waitlistEntries = pgTable(
  "waitlist_entries",
  {
    id: text("id").primaryKey(),
    sandboxId: sandboxId(),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    /** Null means any therapist. */
    therapistId: text("therapist_id").references(() => therapists.id, { onDelete: "cascade" }),
    /** Weekdays that suit the client (1 is Monday). */
    days: jsonb("days").$type<number[]>().notNull(),
    parts: jsonb("parts").$type<PartOfDay[]>().notNull(),
    mode: text("mode").$type<ModePreference>().notNull(),
    joinedAt: at("joined_at").notNull(),
    status: text("status").$type<WaitlistStatus>().notNull().default("waiting"),
  },
  (t) => [index("waitlist_sandbox").on(t.sandboxId), index("waitlist_client").on(t.clientId), index("waitlist_therapist").on(t.therapistId)],
);

export type OpeningStatus = "offering" | "filled" | "unfilled";

/** A slot freed by a cancellation, and what became of it. */
export const openings = pgTable(
  "openings",
  {
    id: text("id").primaryKey(),
    sandboxId: sandboxId(),
    therapistId: text("therapist_id")
      .notNull()
      .references(() => therapists.id, { onDelete: "cascade" }),
    startsAt: at("starts_at").notNull(),
    cancelledAppointmentId: text("cancelled_appointment_id")
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),
    openedAt: at("opened_at").notNull(),
    status: text("status").$type<OpeningStatus>().notNull().default("offering"),
    filledAppointmentId: text("filled_appointment_id").references(() => appointments.id, { onDelete: "set null" }),
    closedAt: at("closed_at"),
  },
  (t) => [
    index("openings_sandbox").on(t.sandboxId),
    index("openings_therapist").on(t.therapistId),
    index("openings_cancelled").on(t.cancelledAppointmentId),
    index("openings_filled").on(t.filledAppointmentId),
  ],
);

export type OfferStatus = "sent" | "accepted" | "declined" | "expired";

/** One waitlisted client's turn at an opening. Only one offer per opening is live at a time. */
export const offers = pgTable(
  "offers",
  {
    id: text("id").primaryKey(),
    sandboxId: sandboxId(),
    openingId: text("opening_id")
      .notNull()
      .references(() => openings.id, { onDelete: "cascade" }),
    entryId: text("entry_id")
      .notNull()
      .references(() => waitlistEntries.id, { onDelete: "cascade" }),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    sentAt: at("sent_at").notNull(),
    expiresAt: at("expires_at").notNull(),
    status: text("status").$type<OfferStatus>().notNull().default("sent"),
    respondedAt: at("responded_at"),
  },
  (t) => [
    index("offers_sandbox").on(t.sandboxId),
    index("offers_opening").on(t.openingId),
    index("offers_entry").on(t.entryId),
    index("offers_client").on(t.clientId),
    uniqueIndex("offers_token").on(t.token),
    uniqueIndex("offers_one_live_per_opening").on(t.openingId).where(sql`status = 'sent'`),
  ],
);

export type EventTone = "neutral" | "good" | "warn";

/** The story of an opening, one line per thing that happened. */
export const openingEvents = pgTable(
  "opening_events",
  {
    id: text("id").primaryKey(),
    sandboxId: sandboxId(),
    openingId: text("opening_id")
      .notNull()
      .references(() => openings.id, { onDelete: "cascade" }),
    at: at("at").notNull(),
    /** Insertion order, to keep events that share a timestamp in sequence. */
    n: serial("n"),
    tone: text("tone").$type<EventTone>().notNull().default("neutral"),
    text: text("text").notNull(),
  },
  (t) => [index("opening_events_opening").on(t.openingId), index("opening_events_sandbox").on(t.sandboxId)],
);

export type ReminderStatus = "scheduled" | "sent" | "cancelled";

export const reminders = pgTable(
  "reminders",
  {
    id: text("id").primaryKey(),
    sandboxId: sandboxId(),
    appointmentId: text("appointment_id")
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),
    hoursBefore: integer("hours_before").notNull(),
    dueAt: at("due_at").notNull(),
    status: text("status").$type<ReminderStatus>().notNull().default("scheduled"),
    sentAt: at("sent_at"),
  },
  (t) => [index("reminders_sandbox_due").on(t.sandboxId, t.dueAt), index("reminders_appointment").on(t.appointmentId)],
);

export type MessageKind = "booked" | "reminder" | "cancelled" | "offer" | "offer_accepted" | "waitlist_joined";

/** Everything the system would have sent. Nothing in this demo leaves the database. */
export const outboxMessages = pgTable(
  "outbox_messages",
  {
    id: text("id").primaryKey(),
    sandboxId: sandboxId(),
    createdAt: at("created_at").notNull(),
    /** Insertion order, to keep messages that share a timestamp in sequence. */
    n: serial("n"),
    channel: text("channel").$type<"sms" | "email">().notNull(),
    kind: text("kind").$type<MessageKind>().notNull(),
    recipientName: text("recipient_name").notNull(),
    recipient: text("recipient").notNull(),
    subject: text("subject"),
    body: text("body").notNull(),
    /** The page the link in the message opens, so the visitor can follow it. */
    link: text("link"),
  },
  (t) => [index("outbox_sandbox").on(t.sandboxId, t.createdAt)],
);

export type Therapist = typeof therapists.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type WaitlistEntry = typeof waitlistEntries.$inferSelect;
export type Opening = typeof openings.$inferSelect;
export type Offer = typeof offers.$inferSelect;
export type OpeningEvent = typeof openingEvents.$inferSelect;
export type Reminder = typeof reminders.$inferSelect;
export type OutboxMessage = typeof outboxMessages.$inferSelect;
