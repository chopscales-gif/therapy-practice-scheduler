import { randomBytes, randomUUID } from "node:crypto";
import { and, asc, count, eq, inArray, lte } from "drizzle-orm";
import type { Db } from "@/db/client";
import {
  appointments,
  clients,
  offers,
  openingEvents,
  openings,
  outboxMessages,
  reminders,
  sandboxes,
  therapists,
  waitlistEntries,
  type Appointment,
  type AppointmentSource,
  type AppointmentStatus,
  type Client,
  type EventTone,
  type Offer,
  type Opening,
  type Therapist,
} from "@/db/schema";
import { bookedMessage, cancelledMessage, offerAcceptedMessage, offerMessage, reminderMessage, waitlistJoinedMessage, type Draft } from "@/lib/messages";
import {
  OFFER_CUTOFF_HOURS,
  OFFER_WINDOW_MINUTES,
  REMINDER_HOURS,
  SESSION_MINUTES,
  type ContactBy,
  type Mode,
  type ModePreference,
  type PartOfDay,
  type Practice,
} from "@/lib/practice";
import { earliestBookable, horizonEnd, isSessionStart } from "@/lib/slots";
import { story } from "@/lib/story";
import { addDays, compareDays, dayOf, zonedTime } from "@/lib/time";
import { modeForOffer, rankCandidates, type Candidate, type Verdict } from "@/lib/waitlist";

/**
 * Every change to the schedule goes through this file: booking, confirming,
 * cancelling, offering an opened slot down the waitlist, and moving the clock.
 * The functions take a context instead of reading the request, so the same
 * code runs under the tests and under the app.
 */

/**
 * `now` is the sandbox's demo clock, not the wall clock. `practice` is whose
 * name goes on new messages; left out, it is the fictional practice.
 */
export type Ctx = { db: Db; sandboxId: string; now: Date; practice?: Practice };

/** A refusal with a reason the screen can show as it is. */
export class WorkflowError extends Error {}

const ACTIVE: AppointmentStatus[] = ["booked", "confirmed"];
const MAX_ONLINE_BOOKINGS = 40;
const MAX_WAITLIST = 40;
/** How far the visitor can skip the demo clock ahead of where it started. */
export const CLOCK_LIMIT_DAYS = 10;

const token = () => randomBytes(18).toString("base64url");

/**
 * Runs the work in a transaction that holds a lock on the sandbox's own row,
 * so changes to one sandbox happen one at a time, in order. The clock is read
 * again under the lock: a request that started before another tab skipped the
 * clock ahead carries on from the newer time, never the older one.
 */
function atomically<T>(ctx: Ctx, work: (tx: Ctx) => Promise<T>): Promise<T> {
  return ctx.db.transaction(async (transaction) => {
    const db = transaction as unknown as Db;
    const [sandbox] = await db.select({ clockAt: sandboxes.clockAt }).from(sandboxes).where(eq(sandboxes.id, ctx.sandboxId)).for("update");
    if (!sandbox) throw new WorkflowError("This demo was reset in another tab. Reload the page.");
    return work({ ...ctx, db, now: sandbox.clockAt > ctx.now ? sandbox.clockAt : ctx.now });
  });
}

async function findTherapist(ctx: Ctx, id: string): Promise<Therapist | undefined> {
  const [row] = await ctx.db.select().from(therapists).where(and(eq(therapists.id, id), eq(therapists.sandboxId, ctx.sandboxId)));
  return row;
}

async function findClient(ctx: Ctx, id: string): Promise<Client> {
  const [row] = await ctx.db.select().from(clients).where(and(eq(clients.id, id), eq(clients.sandboxId, ctx.sandboxId)));
  return row;
}

async function queue(ctx: Ctx, to: Client, draft: Draft, at = ctx.now): Promise<void> {
  await ctx.db.insert(outboxMessages).values({
    id: randomUUID(),
    sandboxId: ctx.sandboxId,
    createdAt: at,
    channel: draft.channel,
    kind: draft.kind,
    recipientName: to.name,
    recipient: draft.channel === "sms" ? to.phone : to.email,
    subject: draft.subject,
    body: draft.body,
    link: draft.link,
  });
}

async function record(ctx: Ctx, openingId: string, text: string, tone: EventTone = "neutral"): Promise<void> {
  await ctx.db.insert(openingEvents).values({ id: randomUUID(), sandboxId: ctx.sandboxId, openingId, at: ctx.now, tone, text });
}

type Person = { name: string; email: string; phone: string; contactBy: ContactBy };

/**
 * Clients are recognised by email address, as they would be when rebooking.
 * A form anyone can fill in never changes the details already on file: knowing
 * someone's email address must not be enough to redirect their reminders.
 */
async function findOrCreateClient(ctx: Ctx, person: Person): Promise<Client> {
  const details = { name: person.name.trim(), email: person.email.trim().toLowerCase(), phone: person.phone.trim(), contactBy: person.contactBy };
  const [existing] = await ctx.db.select().from(clients).where(and(eq(clients.sandboxId, ctx.sandboxId), eq(clients.email, details.email)));
  if (existing) return existing;
  const [created] = await ctx.db
    .insert(clients)
    .values({ id: randomUUID(), sandboxId: ctx.sandboxId, ...details })
    .returning();
  return created;
}

/** Null when the slot is already taken: the unique index is the final word on double booking. */
async function insertAppointment(
  ctx: Ctx,
  values: { therapistId: string; clientId: string; startsAt: Date; mode: Mode; source: AppointmentSource },
): Promise<Appointment | null> {
  const [row] = await ctx.db
    .insert(appointments)
    .values({ id: randomUUID(), sandboxId: ctx.sandboxId, token: token(), createdAt: ctx.now, status: "booked", ...values })
    .onConflictDoNothing()
    .returning();
  return row ?? null;
}

async function scheduleReminders(ctx: Ctx, appointment: Appointment): Promise<void> {
  const due = REMINDER_HOURS.map((hoursBefore) => ({ hoursBefore, dueAt: new Date(appointment.startsAt.getTime() - hoursBefore * 3_600_000) })).filter(
    (reminder) => reminder.dueAt > ctx.now,
  );
  if (!due.length) return;
  await ctx.db.insert(reminders).values(due.map((reminder) => ({ id: randomUUID(), sandboxId: ctx.sandboxId, appointmentId: appointment.id, ...reminder })));
}

async function isBusy(ctx: Ctx, clientId: string, startsAt: Date): Promise<boolean> {
  const [clash] = await ctx.db
    .select({ id: appointments.id })
    .from(appointments)
    .where(and(eq(appointments.sandboxId, ctx.sandboxId), eq(appointments.clientId, clientId), eq(appointments.startsAt, startsAt), inArray(appointments.status, ACTIVE)));
  return Boolean(clash);
}

export type BookingRequest = Person & { therapistId: string; startsAt: Date; mode: Mode };

/** A client books an open time online. */
export function book(outer: Ctx, request: BookingRequest): Promise<Appointment> {
  return atomically(outer, async (ctx) => {
    const therapist = await findTherapist(ctx, request.therapistId);
    if (!therapist) throw new WorkflowError("That therapist could not be found.");
    if (!isSessionStart(therapist.hours, request.startsAt)) throw new WorkflowError(`${therapist.name} does not see clients at that time.`);
    if (request.startsAt < earliestBookable(ctx.now)) throw new WorkflowError("That time is too soon to book online. Pick a later one, or call the practice.");
    if (compareDays(dayOf(request.startsAt), horizonEnd(ctx.now)) >= 0) throw new WorkflowError("That time is too far ahead to book online yet.");
    if (request.mode === "video" && !therapist.offersVideo) throw new WorkflowError(`${therapist.name} sees clients in person only.`);

    const [held] = await ctx.db
      .select({ id: openings.id })
      .from(openings)
      .where(
        and(eq(openings.sandboxId, ctx.sandboxId), eq(openings.therapistId, therapist.id), eq(openings.startsAt, request.startsAt), eq(openings.status, "offering")),
      );
    if (held) throw new WorkflowError("That time is being held for someone on the waitlist. Pick another.");

    const [{ total }] = await ctx.db
      .select({ total: count() })
      .from(appointments)
      .where(and(eq(appointments.sandboxId, ctx.sandboxId), eq(appointments.source, "online")));
    if (total >= MAX_ONLINE_BOOKINGS) throw new WorkflowError("This demo sandbox is full. Use Reset in the bar at the top to start again.");

    const client = await findOrCreateClient(ctx, request);
    if (await isBusy(ctx, client.id, request.startsAt)) throw new WorkflowError("You already have an appointment at that time.");
    const appointment = await insertAppointment(ctx, {
      therapistId: therapist.id,
      clientId: client.id,
      startsAt: request.startsAt,
      mode: request.mode,
      source: "online",
    });
    if (!appointment) throw new WorkflowError("Someone else just took that time. Pick another.");
    await scheduleReminders(ctx, appointment);
    await queue(ctx, client, bookedMessage(client, appointment.startsAt, appointment.mode, appointment.token, ctx.practice));
    return appointment;
  });
}

export async function findAppointmentByToken(ctx: Ctx, value: string): Promise<Appointment | undefined> {
  const [row] = await ctx.db.select().from(appointments).where(and(eq(appointments.token, value), eq(appointments.sandboxId, ctx.sandboxId)));
  return row;
}

/** The client says they are coming. */
export function confirm(outer: Ctx, appointmentToken: string): Promise<void> {
  return atomically(outer, async (ctx) => {
    const appointment = await findAppointmentByToken(ctx, appointmentToken);
    if (!appointment) throw new WorkflowError("That appointment could not be found.");
    if (appointment.status === "confirmed") return;
    if (appointment.status !== "booked") throw new WorkflowError(`This appointment is already ${appointment.status}.`);
    await ctx.db
      .update(appointments)
      .set({ status: "confirmed" })
      .where(and(eq(appointments.id, appointment.id), eq(appointments.sandboxId, ctx.sandboxId), eq(appointments.status, "booked")));
  });
}

/**
 * Cancels an appointment and starts filling the time it frees. Returns the
 * opening, whose timeline shows what happened next.
 */
export function cancel(ctx: Ctx, appointmentId: string, who: "client" | "practice"): Promise<Opening> {
  return atomically(ctx, async (tx) => {
    const [appointment] = await tx.db.select().from(appointments).where(and(eq(appointments.id, appointmentId), eq(appointments.sandboxId, tx.sandboxId)));
    if (!appointment) throw new WorkflowError("That appointment could not be found.");
    if (!ACTIVE.includes(appointment.status)) throw new WorkflowError(`This appointment is already ${appointment.status}.`);
    if (appointment.startsAt <= tx.now) throw new WorkflowError("This appointment has already started, so it can no longer be cancelled here.");

    // The status condition makes two cancellations at once harmless: only one changes the row.
    const changed = await tx.db
      .update(appointments)
      .set({ status: "cancelled", cancelledAt: tx.now })
      .where(and(eq(appointments.id, appointment.id), inArray(appointments.status, ACTIVE)))
      .returning({ id: appointments.id });
    if (!changed.length) throw new WorkflowError("This appointment is already cancelled.");

    await tx.db
      .update(reminders)
      .set({ status: "cancelled" })
      .where(and(eq(reminders.appointmentId, appointment.id), eq(reminders.status, "scheduled")));
    const client = await findClient(tx, appointment.clientId);
    await queue(tx, client, cancelledMessage(client, appointment.startsAt, tx.practice));

    const [opening] = await tx.db
      .insert(openings)
      .values({
        id: randomUUID(),
        sandboxId: tx.sandboxId,
        therapistId: appointment.therapistId,
        startsAt: appointment.startsAt,
        cancelledAppointmentId: appointment.id,
        openedAt: tx.now,
      })
      .returning();
    await record(tx, opening.id, story.cancelled(client.name, who));
    await offerToNext(tx, opening.id);
    const [current] = await tx.db.select().from(openings).where(eq(openings.id, opening.id));
    return current;
  });
}

export async function cancelByToken(ctx: Ctx, appointmentToken: string): Promise<Opening> {
  const appointment = await findAppointmentByToken(ctx, appointmentToken);
  if (!appointment) throw new WorkflowError("That appointment could not be found.");
  return cancel(ctx, appointment.id, "client");
}

async function waitingCandidates(ctx: Ctx): Promise<Candidate[]> {
  const rows = await ctx.db
    .select({ entry: waitlistEntries, clientName: clients.name })
    .from(waitlistEntries)
    .innerJoin(clients, eq(clients.id, waitlistEntries.clientId))
    .where(and(eq(waitlistEntries.sandboxId, ctx.sandboxId), eq(waitlistEntries.status, "waiting")));
  return rows.map(({ entry, clientName }) => ({
    entryId: entry.id,
    clientId: entry.clientId,
    clientName,
    therapistId: entry.therapistId,
    days: entry.days,
    parts: entry.parts,
    mode: entry.mode,
    joinedAt: entry.joinedAt,
  }));
}

/** Who would be offered this time, in order, and who would not and why. */
async function rankFor(
  ctx: Ctx,
  therapist: Therapist,
  startsAt: Date,
  opening: { id: string | null; cancelledByClientId: string },
): Promise<{ eligible: Verdict[]; skipped: Verdict[] }> {
  const busy = await ctx.db
    .select({ clientId: appointments.clientId })
    .from(appointments)
    .where(and(eq(appointments.sandboxId, ctx.sandboxId), eq(appointments.startsAt, startsAt), inArray(appointments.status, ACTIVE)));
  const had = opening.id ? await ctx.db.select({ entryId: offers.entryId }).from(offers).where(eq(offers.openingId, opening.id)) : [];
  const holding = await ctx.db
    .select({ entryId: offers.entryId })
    .from(offers)
    .where(and(eq(offers.sandboxId, ctx.sandboxId), eq(offers.status, "sent")));
  return rankCandidates({ therapistId: therapist.id, therapistName: therapist.name, therapistOffersVideo: therapist.offersVideo, startsAt }, await waitingCandidates(ctx), {
    now: ctx.now,
    busyClientIds: new Set(busy.map((row) => row.clientId)),
    alreadyOffered: new Set(had.map((row) => row.entryId)),
    holdingAnotherOffer: new Set(holding.map((row) => row.entryId)),
    cancelledByClientId: opening.cancelledByClientId,
  });
}

/** What would happen if this appointment were cancelled right now. Read-only. */
export async function previewCancellation(ctx: Ctx, appointment: Appointment): Promise<{ eligible: Verdict[]; skipped: Verdict[]; tooLate: boolean }> {
  const therapist = (await findTherapist(ctx, appointment.therapistId))!;
  const ranked = await rankFor(ctx, therapist, appointment.startsAt, { id: null, cancelledByClientId: appointment.clientId });
  return { ...ranked, tooLate: ctx.now >= offerCutoff(appointment.startsAt) };
}

const offerCutoff = (startsAt: Date) => new Date(startsAt.getTime() - OFFER_CUTOFF_HOURS * 3_600_000);

/**
 * Gives the opening to the next person in line, or closes it if there is no
 * one left or no time left. Does nothing while an offer is still out.
 */
async function offerToNext(ctx: Ctx, openingId: string): Promise<void> {
  const [opening] = await ctx.db.select().from(openings).where(and(eq(openings.id, openingId), eq(openings.sandboxId, ctx.sandboxId)));
  if (!opening || opening.status !== "offering") return;
  const made = await ctx.db.select({ status: offers.status }).from(offers).where(eq(offers.openingId, opening.id));
  if (made.some((offer) => offer.status === "sent")) return;

  const close = async (text: string) => {
    await ctx.db.update(openings).set({ status: "unfilled", closedAt: ctx.now }).where(eq(openings.id, opening.id));
    await record(ctx, opening.id, text, "warn");
  };

  const cutoff = offerCutoff(opening.startsAt);
  if (ctx.now >= cutoff) return close(story.tooLate(made.length));

  const therapist = (await findTherapist(ctx, opening.therapistId))!;
  const [cancelled] = await ctx.db.select({ clientId: appointments.clientId }).from(appointments).where(eq(appointments.id, opening.cancelledAppointmentId));
  const { eligible } = await rankFor(ctx, therapist, opening.startsAt, { id: opening.id, cancelledByClientId: cancelled.clientId });
  if (!eligible.length) return close(story.noOne(made.length));

  const next = eligible[0].candidate;
  const window = new Date(ctx.now.getTime() + OFFER_WINDOW_MINUTES * 60_000);
  const [offer] = await ctx.db
    .insert(offers)
    .values({
      id: randomUUID(),
      sandboxId: ctx.sandboxId,
      openingId: opening.id,
      entryId: next.entryId,
      clientId: next.clientId,
      token: token(),
      sentAt: ctx.now,
      // Never hold a slot past the point where it could no longer be offered on.
      expiresAt: window < cutoff ? window : cutoff,
    })
    .returning();
  const client = await findClient(ctx, next.clientId);
  const message = offerMessage(client, opening.startsAt, offer.expiresAt, offer.token, ctx.practice);
  await queue(ctx, client, message);
  await record(ctx, opening.id, story.offered(client.name, message.channel, offer.expiresAt));
}

export async function findOfferByToken(ctx: Ctx, value: string): Promise<Offer | undefined> {
  const [row] = await ctx.db.select().from(offers).where(and(eq(offers.token, value), eq(offers.sandboxId, ctx.sandboxId)));
  return row;
}

/** A waitlisted client answers the offer they were sent. */
export function respondToOffer(ctx: Ctx, offerToken: string, answer: "accept" | "decline"): Promise<void> {
  return atomically(ctx, async (tx) => {
    const offer = await findOfferByToken(tx, offerToken);
    if (!offer) throw new WorkflowError("That offer could not be found.");
    if (offer.status !== "sent") throw new WorkflowError(offer.status === "expired" ? "This offer has passed to the next person." : "This offer has already been answered.");
    if (tx.now >= offer.expiresAt) throw new WorkflowError("This offer has passed to the next person.");

    // Claim the offer first. If it was answered or expired a moment ago, stop here.
    const claimed = await tx.db
      .update(offers)
      .set({ status: answer === "accept" ? "accepted" : "declined", respondedAt: tx.now })
      .where(and(eq(offers.id, offer.id), eq(offers.status, "sent")))
      .returning({ id: offers.id });
    if (!claimed.length) throw new WorkflowError("This offer has already been answered.");

    const client = await findClient(tx, offer.clientId);
    if (answer === "decline") {
      await record(tx, offer.openingId, story.declined(client.name));
      await offerToNext(tx, offer.openingId);
      return;
    }

    const [opening] = await tx.db.select().from(openings).where(eq(openings.id, offer.openingId));
    const [entry] = await tx.db.select().from(waitlistEntries).where(eq(waitlistEntries.id, offer.entryId));
    const therapist = (await findTherapist(tx, opening.therapistId))!;
    if (entry.status !== "waiting") throw new WorkflowError("You are no longer on the waitlist, so this offer has closed.");
    if (await isBusy(tx, client.id, opening.startsAt)) throw new WorkflowError("You already have an appointment at that time. Pass on this one, or cancel the other first.");
    const appointment = await insertAppointment(tx, {
      therapistId: opening.therapistId,
      clientId: client.id,
      startsAt: opening.startsAt,
      mode: modeForOffer(entry.mode, therapist.offersVideo),
      source: "waitlist",
    });
    if (!appointment) throw new WorkflowError("This time has just been taken.");

    await tx.db.update(openings).set({ status: "filled", filledAppointmentId: appointment.id, closedAt: tx.now }).where(eq(openings.id, opening.id));
    await tx.db.update(waitlistEntries).set({ status: "placed" }).where(eq(waitlistEntries.id, entry.id));
    await scheduleReminders(tx, appointment);
    await queue(tx, client, offerAcceptedMessage(client, appointment.startsAt, appointment.token, tx.practice));
    await record(tx, opening.id, story.accepted(client.name, offer.sentAt, tx.now), "good");
  });
}

export type WaitlistRequest = Person & { therapistId: string | null; days: number[]; parts: PartOfDay[]; mode: ModePreference };

/** A client asks to be told when a time that suits them opens up. */
export function joinWaitlist(outer: Ctx, request: WaitlistRequest): Promise<void> {
  return atomically(outer, async (ctx) => {
    const days = [...new Set(request.days)].filter((day) => day >= 1 && day <= 5);
    const parts = [...new Set(request.parts)];
    if (!days.length) throw new WorkflowError("Choose at least one day that suits you.");
    if (!parts.length) throw new WorkflowError("Choose at least one time of day that suits you.");
    if (request.therapistId) {
      const therapist = await findTherapist(ctx, request.therapistId);
      if (!therapist) throw new WorkflowError("That therapist could not be found.");
      if (request.mode === "video" && !therapist.offersVideo) throw new WorkflowError(`${therapist.name} sees clients in person only.`);
    }
    const [{ total }] = await ctx.db.select({ total: count() }).from(waitlistEntries).where(eq(waitlistEntries.sandboxId, ctx.sandboxId));
    if (total >= MAX_WAITLIST) throw new WorkflowError("This demo sandbox is full. Use Reset in the bar at the top to start again.");

    const client = await findOrCreateClient(ctx, request);
    const [already] = await ctx.db
      .select({ id: waitlistEntries.id })
      .from(waitlistEntries)
      .where(and(eq(waitlistEntries.clientId, client.id), eq(waitlistEntries.status, "waiting")));
    if (already) throw new WorkflowError("You are already on the waitlist.");
    await ctx.db.insert(waitlistEntries).values({
      id: randomUUID(),
      sandboxId: ctx.sandboxId,
      clientId: client.id,
      therapistId: request.therapistId,
      days,
      parts,
      mode: request.mode,
      joinedAt: ctx.now,
    });
    await queue(ctx, client, waitlistJoinedMessage(client, ctx.practice));
  });
}

/**
 * Moves the demo clock to `target` and does everything that would have
 * happened on the way, in order: offers lapse and pass to the next person,
 * reminders go out, and sessions that have ended are marked completed.
 */
export async function runClockTo(ctx: Ctx, target: Date): Promise<void> {
  if (target <= ctx.now) return;
  await atomically(ctx, async (tx) => {
    // Another tab may already have moved the clock past this point. It never runs backwards.
    if (target <= tx.now) return;
    for (;;) {
      const [lapsed] = await tx.db
        .select()
        .from(offers)
        .where(and(eq(offers.sandboxId, tx.sandboxId), eq(offers.status, "sent"), lte(offers.expiresAt, target)))
        .orderBy(asc(offers.expiresAt))
        .limit(1);
      if (!lapsed) break;
      // Each lapse is handled as of the moment it happened, so the next offer's window starts then.
      const then: Ctx = { ...tx, now: lapsed.expiresAt };
      await then.db.update(offers).set({ status: "expired", respondedAt: lapsed.expiresAt }).where(and(eq(offers.id, lapsed.id), eq(offers.status, "sent")));
      const client = await findClient(then, lapsed.clientId);
      await record(then, lapsed.openingId, story.expired(client.name, lapsed.expiresAt), "warn");
      await offerToNext(then, lapsed.openingId);
    }

    const due = await tx.db
      .select({ reminder: reminders, appointment: appointments, client: clients })
      .from(reminders)
      .innerJoin(appointments, eq(appointments.id, reminders.appointmentId))
      .innerJoin(clients, eq(clients.id, appointments.clientId))
      .where(and(eq(reminders.sandboxId, tx.sandboxId), eq(reminders.status, "scheduled"), lte(reminders.dueAt, target), inArray(appointments.status, ACTIVE)))
      .orderBy(asc(reminders.dueAt));
    for (const { reminder, appointment, client } of due) {
      await tx.db.update(reminders).set({ status: "sent", sentAt: reminder.dueAt }).where(and(eq(reminders.id, reminder.id), eq(reminders.status, "scheduled")));
      await queue(tx, client, reminderMessage(client, appointment.startsAt, reminder.hoursBefore, appointment.token, tx.practice), reminder.dueAt);
    }

    await tx.db
      .update(appointments)
      .set({ status: "completed" })
      .where(
        and(
          eq(appointments.sandboxId, tx.sandboxId),
          inArray(appointments.status, ACTIVE),
          lte(appointments.startsAt, new Date(target.getTime() - SESSION_MINUTES * 60_000)),
        ),
      );
    await tx.db.update(sandboxes).set({ clockAt: target }).where(eq(sandboxes.id, tx.sandboxId));
  });
}

export type ClockStep = "20min" | "tomorrow";

/** The visitor skips the demo clock ahead. */
export async function skipAhead(ctx: Ctx, step: ClockStep): Promise<Date> {
  const target = step === "20min" ? new Date(ctx.now.getTime() + 20 * 60_000) : zonedTime(addDays(dayOf(ctx.now), 1), 8);
  const [sandbox] = await ctx.db.select().from(sandboxes).where(eq(sandboxes.id, ctx.sandboxId));
  const limit = new Date(sandbox.clockStartAt.getTime() + CLOCK_LIMIT_DAYS * 86_400_000);
  if (target > limit) throw new WorkflowError(`The demo clock stops ${CLOCK_LIMIT_DAYS} days in. Use Reset in the bar at the top to start again.`);
  await runClockTo(ctx, target);
  return target;
}
