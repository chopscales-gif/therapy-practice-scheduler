import { and, asc, count, desc, eq, gte, inArray, lt } from "drizzle-orm";
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
  type Client,
  type Offer,
  type WaitlistEntry,
  type Opening,
  type OpeningEvent,
  type Therapist,
} from "@/db/schema";
import { openSlots, slotKey, type OpenSlot } from "@/lib/slots";
import { OFFER_CUTOFF_HOURS } from "@/lib/practice";
import { addDays, dayOf, mondayOf, zonedTime, type Day } from "@/lib/time";
import type { Ctx } from "./workflow";

/** Read-only queries for the screens. Every one is limited to the visitor's sandbox. */

export function listTherapists(ctx: Ctx): Promise<Therapist[]> {
  return ctx.db.select().from(therapists).where(eq(therapists.sandboxId, ctx.sandboxId)).orderBy(therapists.position);
}

/** Slots nobody can book: taken, or being held for the waitlist. */
async function unavailableSlots(ctx: Ctx, from: Date): Promise<Set<string>> {
  const taken = await ctx.db
    .select({ therapistId: appointments.therapistId, startsAt: appointments.startsAt })
    .from(appointments)
    .where(and(eq(appointments.sandboxId, ctx.sandboxId), gte(appointments.startsAt, from), inArray(appointments.status, ["booked", "confirmed", "completed"])));
  const held = await ctx.db
    .select({ therapistId: openings.therapistId, startsAt: openings.startsAt })
    .from(openings)
    .where(and(eq(openings.sandboxId, ctx.sandboxId), eq(openings.status, "offering")));
  return new Set([...taken, ...held].map((row) => slotKey(row.therapistId, row.startsAt)));
}

export async function bookableSlots(ctx: Ctx): Promise<{ therapists: Therapist[]; slots: OpenSlot[] }> {
  const all = await listTherapists(ctx);
  return { therapists: all, slots: openSlots(all, await unavailableSlots(ctx, ctx.now), ctx.now) };
}

export type Cell =
  | { kind: "off" }
  | { kind: "open"; past: boolean }
  /** A cancelled time nobody has yet: being offered to the waitlist, or offered and not taken. */
  | { kind: "gone"; openingId: string; clientName: string; offering: boolean }
  | { kind: "appointment"; appointment: Appointment; clientName: string };

export type WeekCounts = { confirmed: number; unconfirmed: number; open: number; gone: number };

export type WeekView = { hours: number[]; days: { day: Day; cells: (Cell & { startsAt: Date })[] }[]; counts: WeekCounts };

/** One therapist's Monday-to-Friday week as a grid of hours. */
export async function weekView(ctx: Ctx, therapist: Therapist, monday: Day): Promise<WeekView> {
  const from = zonedTime(monday, 0);
  const to = zonedTime(addDays(monday, 5), 0);
  const rows = await ctx.db
    .select({ appointment: appointments, clientName: clients.name })
    .from(appointments)
    .innerJoin(clients, eq(clients.id, appointments.clientId))
    .where(
      and(
        eq(appointments.sandboxId, ctx.sandboxId),
        eq(appointments.therapistId, therapist.id),
        gte(appointments.startsAt, from),
        lt(appointments.startsAt, to),
        inArray(appointments.status, ["booked", "confirmed", "completed"]),
      ),
    );
  const cancelled = await ctx.db
    .select({ opening: openings, clientName: clients.name })
    .from(openings)
    .innerJoin(appointments, eq(appointments.id, openings.cancelledAppointmentId))
    .innerJoin(clients, eq(clients.id, appointments.clientId))
    .where(
      and(
        eq(openings.sandboxId, ctx.sandboxId),
        eq(openings.therapistId, therapist.id),
        gte(openings.startsAt, from),
        lt(openings.startsAt, to),
        inArray(openings.status, ["offering", "unfilled"]),
      ),
    )
    .orderBy(asc(openings.openedAt));
  const byTime = new Map(rows.map((row) => [row.appointment.startsAt.getTime(), row]));
  // The latest cancellation of a time is the one that says what state it is in.
  const goneByTime = new Map(cancelled.map((row) => [row.opening.startsAt.getTime(), row]));

  const hours = [...new Set(Object.values(therapist.hours).flat())].sort((a, b) => a - b);
  const counts: WeekCounts = { confirmed: 0, unconfirmed: 0, open: 0, gone: 0 };
  const days = [1, 2, 3, 4, 5].map((weekday) => {
    const day = addDays(monday, weekday - 1);
    const working = therapist.hours[String(weekday)] ?? [];
    const cells = hours.map((hour): Cell & { startsAt: Date } => {
      const startsAt = zonedTime(day, hour);
      if (!working.includes(hour)) return { kind: "off", startsAt };
      const row = byTime.get(startsAt.getTime());
      if (row) {
        if (row.appointment.status === "confirmed") counts.confirmed++;
        else if (row.appointment.status === "booked") counts.unconfirmed++;
        return { kind: "appointment", startsAt, ...row };
      }
      const past = startsAt <= ctx.now;
      const gone = goneByTime.get(startsAt.getTime());
      if (gone) {
        if (!past) counts.gone++;
        return { kind: "gone", startsAt, openingId: gone.opening.id, clientName: gone.clientName, offering: gone.opening.status === "offering" };
      }
      if (!past) counts.open++;
      return { kind: "open", startsAt, past };
    });
    return { day, cells };
  });
  return { hours, days, counts };
}

export type AppointmentView = { appointment: Appointment; client: Client; therapist: Therapist };

async function appointmentView(ctx: Ctx, where: ReturnType<typeof eq>): Promise<AppointmentView | null> {
  const [row] = await ctx.db
    .select({ appointment: appointments, client: clients, therapist: therapists })
    .from(appointments)
    .innerJoin(clients, eq(clients.id, appointments.clientId))
    .innerJoin(therapists, eq(therapists.id, appointments.therapistId))
    .where(and(eq(appointments.sandboxId, ctx.sandboxId), where));
  return row ?? null;
}

export const appointmentById = (ctx: Ctx, id: string) => appointmentView(ctx, eq(appointments.id, id));
export const appointmentByToken = (ctx: Ctx, token: string) => appointmentView(ctx, eq(appointments.token, token));

export function remindersFor(ctx: Ctx, appointmentId: string) {
  return ctx.db
    .select()
    .from(reminders)
    .where(and(eq(reminders.sandboxId, ctx.sandboxId), eq(reminders.appointmentId, appointmentId)))
    .orderBy(asc(reminders.dueAt));
}

/** The opening that this appointment's cancellation created, if any. */
export async function openingForCancelled(ctx: Ctx, appointmentId: string): Promise<Opening | null> {
  const [row] = await ctx.db
    .select()
    .from(openings)
    .where(and(eq(openings.sandboxId, ctx.sandboxId), eq(openings.cancelledAppointmentId, appointmentId)));
  return row ?? null;
}

export type OfferView = { offer: Offer; opening: Opening; therapist: Therapist; client: Client; entry: WaitlistEntry };

export async function offerByToken(ctx: Ctx, token: string): Promise<OfferView | null> {
  const [row] = await ctx.db
    .select({ offer: offers, opening: openings, therapist: therapists, client: clients, entry: waitlistEntries })
    .from(offers)
    .innerJoin(waitlistEntries, eq(waitlistEntries.id, offers.entryId))
    .innerJoin(openings, eq(openings.id, offers.openingId))
    .innerJoin(therapists, eq(therapists.id, openings.therapistId))
    .innerJoin(clients, eq(clients.id, offers.clientId))
    .where(and(eq(offers.sandboxId, ctx.sandboxId), eq(offers.token, token)));
  return row ?? null;
}

export async function waitlistView(ctx: Ctx) {
  const rows = await ctx.db
    .select({ entry: waitlistEntries, client: clients })
    .from(waitlistEntries)
    .innerJoin(clients, eq(clients.id, waitlistEntries.clientId))
    .where(and(eq(waitlistEntries.sandboxId, ctx.sandboxId), eq(waitlistEntries.status, "waiting")))
    .orderBy(asc(waitlistEntries.joinedAt));
  const live = await ctx.db
    .select({ entryId: offers.entryId })
    .from(offers)
    .where(and(eq(offers.sandboxId, ctx.sandboxId), eq(offers.status, "sent")));
  const holding = new Set(live.map((offer) => offer.entryId));
  return rows.map((row) => ({ ...row, hasLiveOffer: holding.has(row.entry.id) }));
}

export type OpeningView = {
  opening: Opening;
  therapist: Therapist;
  events: OpeningEvent[];
  /** The offer that is out right now, with the name of the person holding it. */
  live: { offer: Offer; clientName: string } | null;
};

export async function openingsView(ctx: Ctx): Promise<OpeningView[]> {
  const rows = await ctx.db
    .select({ opening: openings, therapist: therapists })
    .from(openings)
    .innerJoin(therapists, eq(therapists.id, openings.therapistId))
    .where(eq(openings.sandboxId, ctx.sandboxId))
    .orderBy(desc(openings.openedAt));
  if (!rows.length) return [];
  const ids = rows.map((row) => row.opening.id);
  const events = await ctx.db.select().from(openingEvents).where(inArray(openingEvents.openingId, ids)).orderBy(asc(openingEvents.at), asc(openingEvents.n));
  const live = await ctx.db
    .select({ offer: offers, clientName: clients.name })
    .from(offers)
    .innerJoin(clients, eq(clients.id, offers.clientId))
    .where(and(inArray(offers.openingId, ids), eq(offers.status, "sent")));
  return rows.map((row) => ({
    ...row,
    events: events.filter((event) => event.openingId === row.opening.id),
    live: live.find((item) => item.offer.openingId === row.opening.id) ?? null,
  }));
}

export function outboxFor(ctx: Ctx) {
  return ctx.db.select().from(outboxMessages).where(eq(outboxMessages.sandboxId, ctx.sandboxId)).orderBy(desc(outboxMessages.createdAt), desc(outboxMessages.n));
}

export async function liveOfferCount(ctx: Ctx): Promise<number> {
  const [{ total }] = await ctx.db
    .select({ total: count() })
    .from(openings)
    .where(and(eq(openings.sandboxId, ctx.sandboxId), eq(openings.status, "offering")));
  return total;
}

export async function outboxCount(ctx: Ctx): Promise<number> {
  const [{ total }] = await ctx.db.select({ total: count() }).from(outboxMessages).where(eq(outboxMessages.sandboxId, ctx.sandboxId));
  return total;
}

export type Scenario = { startsAt: Date; clientName: string; therapistName: string; state: "ready" | "run" | "missed"; openingId: string | null };

/** Where the one-click scenario stands: Tuesday's 3:00 PM with the first therapist. */
export async function scenario(ctx: Ctx): Promise<Scenario | null> {
  const [sandbox] = await ctx.db.select().from(sandboxes).where(eq(sandboxes.id, ctx.sandboxId));
  const startsAt = zonedTime(addDays(mondayOf(dayOf(sandbox.clockStartAt)), 1), 15);
  const [row] = await ctx.db
    .select({ appointment: appointments, clientName: clients.name, therapistName: therapists.name })
    .from(appointments)
    .innerJoin(clients, eq(clients.id, appointments.clientId))
    .innerJoin(therapists, eq(therapists.id, appointments.therapistId))
    .where(and(eq(appointments.sandboxId, ctx.sandboxId), eq(therapists.position, 0), eq(appointments.startsAt, startsAt), eq(appointments.source, "front_desk")))
    .orderBy(asc(appointments.createdAt))
    .limit(1);
  if (!row) return null;
  const opening = await openingForCancelled(ctx, row.appointment.id);
  const tooLate = ctx.now.getTime() >= startsAt.getTime() - OFFER_CUTOFF_HOURS * 3_600_000;
  const state = row.appointment.status === "cancelled" ? "run" : tooLate ? "missed" : "ready";
  return { startsAt, clientName: row.clientName, therapistName: row.therapistName, state, openingId: opening?.id ?? null };
}
