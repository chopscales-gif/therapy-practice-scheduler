import { beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { createEmbeddedDb, type Db } from "@/db/client";
import { ensureSandbox, resetSandbox } from "@/db/sandbox";
import { appointments, clients, offers, openingEvents, openings, outboxMessages, reminders, therapists, waitlistEntries, type Therapist } from "@/db/schema";
import { addDays, dayOf, fmtDateTime, zonedTime } from "@/lib/time";
import { WorkflowError, book, cancel, cancelByToken, confirm, joinWaitlist, previewCancellation, respondToOffer, runClockTo, skipAhead, type BookingRequest, type Ctx } from "./workflow";

/** End-to-end tests of the scheduling workflow against a real (in-memory) Postgres. */

const REAL_NOW = new Date("2026-11-13T18:00:00Z"); // a Friday, so the demo opens on Monday, November 16
const MONDAY = { y: 2026, m: 11, d: 16 };
let db: Db;
let sandboxes = 0;

/** A fresh sandbox for each test that changes things, so tests cannot affect each other. */
async function fresh(): Promise<{ ctx: Ctx; naomi: Therapist; andre: Therapist; soojin: Therapist }> {
  const sandboxId = `visitor-${++sandboxes}`;
  const now = await ensureSandbox(db, sandboxId, REAL_NOW);
  const rows = await db.select().from(therapists).where(eq(therapists.sandboxId, sandboxId)).orderBy(therapists.position);
  return { ctx: { db, sandboxId, now }, naomi: rows[0], andre: rows[1], soojin: rows[2] };
}

const request = (therapistId: string, startsAt: Date, over: Partial<BookingRequest> = {}): BookingRequest => ({
  therapistId,
  startsAt,
  mode: "office",
  name: "Jordan Ellery",
  email: "jordan.ellery@mail.example",
  phone: "(801) 555-0117",
  contactBy: "text",
  ...over,
});

async function appointmentAt(ctx: Ctx, therapistId: string, startsAt: Date) {
  const [row] = await ctx.db
    .select()
    .from(appointments)
    .where(and(eq(appointments.sandboxId, ctx.sandboxId), eq(appointments.therapistId, therapistId), eq(appointments.startsAt, startsAt)));
  return row;
}

/** A session of this therapist's that nobody has. */
async function freeSlot(ctx: Ctx, therapist: Therapist, fromDay = 7): Promise<Date> {
  for (let offset = fromDay; offset < 21; offset++) {
    const day = addDays(MONDAY, offset);
    for (const hour of therapist.hours[String(new Date(Date.UTC(day.y, day.m - 1, day.d)).getUTCDay())] ?? []) {
      const startsAt = zonedTime(day, hour);
      const taken = await appointmentAt(ctx, therapist.id, startsAt);
      if (!taken) return startsAt;
    }
  }
  throw new Error("no free slot in the seed");
}

const timeline = async (ctx: Ctx, openingId: string) =>
  (await ctx.db.select().from(openingEvents).where(eq(openingEvents.openingId, openingId)).orderBy(openingEvents.at, openingEvents.n)).map((event) => event.text);
const liveOffer = async (ctx: Ctx, openingId: string) => (await ctx.db.select().from(offers).where(and(eq(offers.openingId, openingId), eq(offers.status, "sent"))))[0];
const clientName = async (ctx: Ctx, id: string) => (await ctx.db.select().from(clients).where(eq(clients.id, id)))[0].name;
const outbox = (ctx: Ctx) => ctx.db.select().from(outboxMessages).where(eq(outboxMessages.sandboxId, ctx.sandboxId));
const TUESDAY_3PM = zonedTime(addDays(MONDAY, 1), 15);

beforeAll(async () => {
  db = await createEmbeddedDb();
}, 60_000);

describe("sandbox", () => {
  it("opens on the next Monday at 9:00 AM with a calendar, a waitlist and one filled cancellation", async () => {
    const { ctx } = await fresh();
    expect(fmtDateTime(ctx.now)).toBe("Mon, Nov 16 at 9:00 AM");
    const booked = await ctx.db.select().from(appointments).where(eq(appointments.sandboxId, ctx.sandboxId));
    expect(booked.length).toBeGreaterThan(40);
    const [filled] = await ctx.db.select().from(openings).where(eq(openings.sandboxId, ctx.sandboxId));
    expect(filled.status).toBe("filled");
    expect(await timeline(ctx, filled.id)).toHaveLength(5);
    const waiting = await ctx.db.select().from(waitlistEntries).where(and(eq(waitlistEntries.sandboxId, ctx.sandboxId), eq(waitlistEntries.status, "waiting")));
    expect(waiting).toHaveLength(8);
  });

  it("never seeds a client into two places at once", async () => {
    const { ctx } = await fresh();
    const rows = await ctx.db.select().from(appointments).where(eq(appointments.sandboxId, ctx.sandboxId));
    const seen = new Set<string>();
    for (const row of rows.filter((row) => row.status !== "cancelled")) {
      const key = `${row.clientId}|${row.startsAt.toISOString()}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it("keeps visitors apart and resets cleanly", async () => {
    const a = await fresh();
    const b = await fresh();
    const startsAt = await freeSlot(a.ctx, a.naomi);
    const made = await book(a.ctx, request(a.naomi.id, startsAt));
    expect(await appointmentAt(b.ctx, b.naomi.id, startsAt)).toBeUndefined();
    await resetSandbox(db, a.ctx.sandboxId, REAL_NOW);
    expect(await db.select().from(appointments).where(eq(appointments.id, made.id))).toHaveLength(0);
    expect((await db.select().from(appointments).where(eq(appointments.sandboxId, a.ctx.sandboxId))).length).toBeGreaterThan(40);
  });
});

describe("booking", () => {
  it("books a free time, schedules both reminders and queues a confirmation", async () => {
    const { ctx, naomi } = await fresh();
    const startsAt = await freeSlot(ctx, naomi);
    const before = (await outbox(ctx)).length;
    const made = await book(ctx, request(naomi.id, startsAt));
    expect(made.status).toBe("booked");
    const scheduled = await ctx.db.select().from(reminders).where(eq(reminders.appointmentId, made.id));
    expect(scheduled.map((reminder) => reminder.hoursBefore).sort()).toEqual([2, 48]);
    const sent = await outbox(ctx);
    expect(sent).toHaveLength(before + 1);
    expect(sent.find((message) => message.kind === "booked")?.link).toBe(`/a/${made.token}`);
  });

  it("refuses a time that is taken, and the database refuses it too", async () => {
    const { ctx, naomi } = await fresh();
    await expect(book(ctx, request(naomi.id, TUESDAY_3PM))).rejects.toThrow(/just took that time/);
    const existing = await appointmentAt(ctx, naomi.id, TUESDAY_3PM);
    await expect(
      ctx.db.insert(appointments).values({ ...existing, id: "dup", token: "dup-token" }),
    ).rejects.toThrow();
  });

  it("lets only one of two simultaneous bookings through", async () => {
    const { ctx, naomi } = await fresh();
    const startsAt = await freeSlot(ctx, naomi);
    const results = await Promise.allSettled([
      book(ctx, request(naomi.id, startsAt)),
      book(ctx, request(naomi.id, startsAt, { name: "Sam Other", email: "sam.other@mail.example" })),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  });

  it("refuses times that are not sessions, too soon, too far ahead, or video with an in-person therapist", async () => {
    const { ctx, naomi, andre } = await fresh();
    const cases: [BookingRequest, RegExp][] = [
      [request(naomi.id, zonedTime(addDays(MONDAY, 8), 12)), /does not see clients/], // her lunch hour
      [request(naomi.id, zonedTime(addDays(MONDAY, 5), 10)), /does not see clients/], // a Saturday
      [request(naomi.id, zonedTime(MONDAY, 10)), /too soon/],
      [request(naomi.id, zonedTime(addDays(MONDAY, 28), 10)), /too far ahead/],
      [request(andre.id, await freeSlot(ctx, andre), { mode: "video" }), /in person only/],
      [request("no-such-therapist", TUESDAY_3PM), /could not be found/],
    ];
    for (const [input, message] of cases) await expect(book(ctx, input)).rejects.toThrow(message);
  });

  it("will not put one client in two rooms at the same time", async () => {
    const { ctx, naomi, soojin } = await fresh();
    // Naomi and Soo-Jin both work Mondays at 9, 10, 11 and 1.
    const monday = addDays(MONDAY, 14);
    let shared: Date | null = null;
    for (const hour of [9, 10, 11, 13]) {
      const at = zonedTime(monday, hour);
      if (!(await appointmentAt(ctx, naomi.id, at)) && !(await appointmentAt(ctx, soojin.id, at))) shared = at;
    }
    expect(shared).not.toBeNull();
    await book(ctx, request(naomi.id, shared!));
    await expect(book(ctx, request(soojin.id, shared!))).rejects.toThrow(/already have an appointment/);
  });

  it("confirms from the client's link", async () => {
    const { ctx, naomi } = await fresh();
    const made = await book(ctx, request(naomi.id, await freeSlot(ctx, naomi)));
    await confirm(ctx, made.token);
    await confirm(ctx, made.token);
    expect((await appointmentAt(ctx, naomi.id, made.startsAt)).status).toBe("confirmed");
    await expect(confirm(ctx, "not-a-token")).rejects.toThrow(WorkflowError);
  });
});

describe("a cancellation fills itself from the waitlist", () => {
  it("previews who would be offered the time, in order, with reasons", async () => {
    const { ctx, naomi } = await fresh();
    const preview = await previewCancellation(ctx, await appointmentAt(ctx, naomi.id, TUESDAY_3PM));
    expect(preview.eligible.map((verdict) => verdict.candidate.clientName)).toEqual(["Maya Okonkwo", "Harriet Lindgren", "Samir Haddad", "Owen Castellan"]);
    expect(Object.fromEntries(preview.skipped.map((verdict) => [verdict.candidate.clientName, verdict.reason]))).toMatchObject({
      "Greta Holloway": "Did not list Tuesdays",
      "Declan Voss": "Did not list afternoons",
      "Priyanka Sethi": "Asked for a different therapist",
    });
  });

  it("offers the time to the longest-waiting match, and books them when they accept", async () => {
    const { ctx, naomi } = await fresh();
    const original = await appointmentAt(ctx, naomi.id, TUESDAY_3PM);
    const opening = await cancel(ctx, original.id, "practice");
    expect(opening.status).toBe("offering");

    const offer = await liveOffer(ctx, opening.id);
    expect(await clientName(ctx, offer.clientId)).toBe("Maya Okonkwo");
    expect(offer.expiresAt.getTime() - ctx.now.getTime()).toBe(20 * 60_000);
    const text = (await outbox(ctx)).find((message) => message.kind === "offer" && message.link === `/offer/${offer.token}`)!;
    expect(text.body).toBe(`Larkspur: a time has opened on Tue, Nov 17 at 3:00 PM. It is held for you until 9:20 AM. Take it or pass: https://larkspur.example/offer/${offer.token}`);

    // While it is held, nobody can book it online.
    await expect(book(ctx, request(naomi.id, TUESDAY_3PM))).rejects.toThrow(/held for someone on the waitlist/);

    const later: Ctx = { ...ctx, now: new Date(ctx.now.getTime() + 6 * 60_000) };
    await respondToOffer(later, offer.token, "accept");
    const [filled] = await ctx.db.select().from(openings).where(eq(openings.id, opening.id));
    expect(filled.status).toBe("filled");
    const rows = await ctx.db
      .select()
      .from(appointments)
      .where(and(eq(appointments.sandboxId, ctx.sandboxId), eq(appointments.therapistId, naomi.id), eq(appointments.startsAt, TUESDAY_3PM)));
    expect(rows.map((row) => row.status).sort()).toEqual(["booked", "cancelled"]);
    const [entry] = await ctx.db.select().from(waitlistEntries).where(eq(waitlistEntries.id, offer.entryId));
    expect(entry.status).toBe("placed");
    expect((await timeline(ctx, opening.id)).at(-1)).toBe("Maya Okonkwo took it after 6 minutes. The time is filled.");
    await expect(respondToOffer(later, offer.token, "accept")).rejects.toThrow(/already been answered/);
  });

  it("passes to the next person when someone declines or does not answer", async () => {
    const { ctx, naomi } = await fresh();
    const opening = await cancel(ctx, (await appointmentAt(ctx, naomi.id, TUESDAY_3PM)).id, "client");
    const first = await liveOffer(ctx, opening.id);
    await respondToOffer(ctx, first.token, "decline");
    const second = await liveOffer(ctx, opening.id);
    expect(await clientName(ctx, second.clientId)).toBe("Harriet Lindgren");

    // Nobody answers for 20 minutes.
    const after = new Date(ctx.now.getTime() + 20 * 60_000);
    await runClockTo(ctx, after);
    const third = await liveOffer(ctx, opening.id);
    expect(await clientName(ctx, third.clientId)).toBe("Samir Haddad");
    expect(third.sentAt).toEqual(after);
    await expect(respondToOffer({ ...ctx, now: after }, second.token, "accept")).rejects.toThrow(/passed to the next person/);
    // The people passed over are still on the waitlist for the next opening.
    const [maya] = await ctx.db.select().from(waitlistEntries).where(eq(waitlistEntries.id, first.entryId));
    expect(maya.status).toBe("waiting");
  });

  it("works through the whole list in order when the clock jumps a day, then reopens the time", async () => {
    const { ctx, naomi } = await fresh();
    const opening = await cancel(ctx, (await appointmentAt(ctx, naomi.id, TUESDAY_3PM)).id, "practice");
    await skipAhead(ctx, "tomorrow");
    const story = await timeline(ctx, opening.id);
    expect(story.filter((line) => line.startsWith("Offered to")).map((line) => line.split(" by ")[0])).toEqual([
      "Offered to Maya Okonkwo",
      "Offered to Harriet Lindgren",
      "Offered to Samir Haddad",
      "Offered to Owen Castellan",
    ]);
    // Four people, 20 minutes each, starting at 9:00.
    expect(story.at(-2)).toBe("No answer from Owen Castellan by 10:20 AM. They keep their place on the waitlist.");
    expect(story.at(-1)).toBe("No one else on the waitlist fits this time. It is open for online booking.");
    const [closed] = await ctx.db.select().from(openings).where(eq(openings.id, opening.id));
    expect(closed.status).toBe("unfilled");
    expect(fmtDateTime(closed.closedAt!)).toBe("Mon, Nov 16 at 10:20 AM");

    const tuesday: Ctx = { ...ctx, now: zonedTime(addDays(MONDAY, 1), 8) };
    const made = await book(tuesday, request(naomi.id, TUESDAY_3PM));
    expect(made.source).toBe("online");
  });

  it("does not offer a time that is less than two hours away, and never holds one past that point", async () => {
    const { ctx, naomi } = await fresh();
    const tuesday = addDays(MONDAY, 1);
    const late: Ctx = { ...ctx, now: zonedTime(tuesday, 13, 30) };
    const closed = await cancel(late, (await appointmentAt(ctx, naomi.id, TUESDAY_3PM)).id, "client");
    expect(closed.status).toBe("unfilled");
    expect((await timeline(ctx, closed.id)).at(-1)).toMatch(/Less than 2 hours to go/);

    const other = await fresh();
    const tight: Ctx = { ...other.ctx, now: zonedTime(tuesday, 12, 50) };
    const opening = await cancel(tight, (await appointmentAt(other.ctx, other.naomi.id, TUESDAY_3PM)).id, "client");
    const offer = await liveOffer(other.ctx, opening.id);
    expect(fmtDateTime(offer.expiresAt)).toBe("Tue, Nov 17 at 1:00 PM"); // 10 minutes, not 20
  });

  it("cancels once, stops that appointment's reminders, and tells the client", async () => {
    const { ctx, naomi } = await fresh();
    const made = await book(ctx, request(naomi.id, await freeSlot(ctx, naomi)));
    await cancelByToken(ctx, made.token);
    await expect(cancelByToken(ctx, made.token)).rejects.toThrow(/already cancelled/);
    const left = await ctx.db.select().from(reminders).where(eq(reminders.appointmentId, made.id));
    expect(left.every((reminder) => reminder.status === "cancelled")).toBe(true);
    expect((await outbox(ctx)).filter((message) => message.kind === "cancelled" && message.recipientName === "Jordan Ellery")).toHaveLength(1);
    // Jordan cancelled it, so Jordan is never the one offered it back.
    const all = await ctx.db.select().from(offers).where(eq(offers.sandboxId, ctx.sandboxId));
    expect(all.every((offer) => offer.clientId !== made.clientId)).toBe(true);
  });
});

describe("the clock", () => {
  it("sends reminders when they fall due, without saying what the appointment is for", async () => {
    const { ctx } = await fresh();
    const before = (await outbox(ctx)).filter((message) => message.kind === "reminder").length;
    await skipAhead(ctx, "tomorrow");
    const sent = (await outbox(ctx)).filter((message) => message.kind === "reminder");
    expect(sent.length).toBeGreaterThan(before);
    for (const message of sent) {
      expect(message.body).not.toMatch(/therap|counsel|session|Naomi|Andre|Soo-Jin|video|anxiety/i);
      expect(message.createdAt.getTime()).toBeLessThanOrEqual(zonedTime(addDays(MONDAY, 1), 8).getTime());
    }
    const stale = await ctx.db.select().from(reminders).where(and(eq(reminders.sandboxId, ctx.sandboxId), eq(reminders.status, "scheduled")));
    expect(stale.every((reminder) => reminder.dueAt > zonedTime(addDays(MONDAY, 1), 8))).toBe(true);
  });

  it("marks finished sessions completed and stops at its limit", async () => {
    const { ctx, naomi } = await fresh();
    const next = await skipAhead(ctx, "tomorrow");
    expect(fmtDateTime(next)).toBe("Tue, Nov 17 at 8:00 AM");
    const mondayAtNine = await appointmentAt(ctx, naomi.id, zonedTime(MONDAY, 9));
    if (mondayAtNine) expect(mondayAtNine.status).toBe("completed");
    const active = await ctx.db.select().from(appointments).where(and(eq(appointments.sandboxId, ctx.sandboxId), eq(appointments.status, "confirmed")));
    expect(active.every((row) => row.startsAt > new Date(next.getTime() - 50 * 60_000))).toBe(true);
    expect(await ensureSandbox(db, ctx.sandboxId, REAL_NOW)).toEqual(next);

    const nearLimit: Ctx = { ...ctx, now: zonedTime(addDays(MONDAY, 10), 8, 50) };
    await expect(skipAhead(nearLimit, "20min")).rejects.toThrow(/stops 10 days in/);
  });

  it("does not send a reminder for an appointment cancelled before it fell due", async () => {
    const { ctx, naomi } = await fresh();
    const original = await appointmentAt(ctx, naomi.id, TUESDAY_3PM);
    await cancel(ctx, original.id, "practice");
    await skipAhead(ctx, "tomorrow");
    await runClockTo({ ...ctx, now: zonedTime(addDays(MONDAY, 1), 8) }, zonedTime(addDays(MONDAY, 1), 14));
    const toCorinne = (await outbox(ctx)).filter((message) => message.recipientName === "Corinne Abbott" && message.createdAt >= ctx.now);
    expect(toCorinne.map((message) => message.kind)).toEqual(["cancelled"]);
  });
});

describe("joining the waitlist", () => {
  it("adds the client and they become eligible for a matching opening", async () => {
    const { ctx, andre } = await fresh();
    await joinWaitlist(ctx, { name: "Jordan Ellery", email: "Jordan.Ellery@mail.example", phone: "(801) 555-0117", contactBy: "email", therapistId: andre.id, days: [5], parts: ["morning"], mode: "office" });
    await expect(
      joinWaitlist(ctx, { name: "Jordan Ellery", email: "jordan.ellery@mail.example", phone: "(801) 555-0117", contactBy: "email", therapistId: null, days: [1], parts: ["morning"], mode: "either" }),
    ).rejects.toThrow(/already on the waitlist/);
    await expect(
      joinWaitlist(ctx, { name: "A B", email: "a.b@mail.example", phone: "(801) 555-0118", contactBy: "text", therapistId: andre.id, days: [2], parts: ["morning"], mode: "video" }),
    ).rejects.toThrow(/in person only/);
    await expect(
      joinWaitlist(ctx, { name: "A B", email: "a.b@mail.example", phone: "(801) 555-0118", contactBy: "text", therapistId: null, days: [0, 6], parts: ["morning"], mode: "either" }),
    ).rejects.toThrow(/at least one day/);

    // Find one of Andre's Friday-morning appointments and cancel it.
    const friday = addDays(MONDAY, 4);
    const target = (await appointmentAt(ctx, andre.id, zonedTime(friday, 10))) ?? (await appointmentAt(ctx, andre.id, zonedTime(friday, 11)));
    expect(target).toBeDefined();
    const opening = await cancel(ctx, target.id, "practice");
    const offer = await liveOffer(ctx, opening.id);
    // Owen (any time, any therapist) has waited longer than Jordan, so Owen is first and Jordan second.
    expect(await clientName(ctx, offer.clientId)).toBe("Owen Castellan");
    await respondToOffer(ctx, offer.token, "decline");
    const second = await liveOffer(ctx, opening.id);
    expect(await clientName(ctx, second.clientId)).toBe("Jordan Ellery");
    const message = (await outbox(ctx)).find((row) => row.link === `/offer/${second.token}`)!;
    expect(message.channel).toBe("email");
    expect(dayOf(opening.startsAt)).toEqual(friday);
  });
});

describe("things that go wrong when two things happen at once", () => {
  it("never asks one person to answer two offers at the same time", async () => {
    const { ctx, naomi } = await fresh();
    const tuesday2pm = zonedTime(addDays(MONDAY, 1), 14);
    const first = await cancel(ctx, (await appointmentAt(ctx, naomi.id, TUESDAY_3PM)).id, "practice");
    const second = await cancel(ctx, (await appointmentAt(ctx, naomi.id, tuesday2pm)).id, "practice");

    const forFirst = await liveOffer(ctx, first.id);
    expect(await clientName(ctx, forFirst.clientId)).toBe("Maya Okonkwo");
    const forSecond = await liveOffer(ctx, second.id);
    // The second time goes to someone else, or to nobody, but not to Maya while she is deciding.
    if (forSecond) expect(forSecond.entryId).not.toBe(forFirst.entryId);

    const live = await ctx.db.select().from(offers).where(and(eq(offers.sandboxId, ctx.sandboxId), eq(offers.status, "sent")));
    expect(new Set(live.map((offer) => offer.entryId)).size).toBe(live.length);
  });

  it("will not let someone take an offered time they are already booked for elsewhere", async () => {
    const { ctx, naomi, andre } = await fresh();
    const opening = await cancel(ctx, (await appointmentAt(ctx, naomi.id, TUESDAY_3PM)).id, "practice");
    const offer = await liveOffer(ctx, opening.id);
    const [maya] = await ctx.db.select().from(clients).where(eq(clients.id, offer.clientId));
    const clash = await appointmentAt(ctx, andre.id, TUESDAY_3PM);
    if (clash) await cancel(ctx, clash.id, "practice");
    await ctx.db.update(openings).set({ status: "unfilled" }).where(and(eq(openings.sandboxId, ctx.sandboxId), eq(openings.therapistId, andre.id)));
    await book(ctx, request(andre.id, TUESDAY_3PM, { name: maya.name, email: maya.email, phone: maya.phone }));

    await expect(respondToOffer(ctx, offer.token, "accept")).rejects.toThrow(/already have an appointment at that time/);
    // The refusal undid everything: the offer is still hers to pass on.
    expect((await liveOffer(ctx, opening.id)).id).toBe(offer.id);
  });

  it("does not let a booking form change the details on file for an existing client", async () => {
    const { ctx, soojin } = await fresh();
    const [corinne] = await ctx.db.select().from(clients).where(and(eq(clients.sandboxId, ctx.sandboxId), eq(clients.name, "Corinne Abbott")));
    const appointment = await book(ctx, request(soojin.id, await freeSlot(ctx, soojin), { name: "Somebody Else", email: corinne.email.toUpperCase(), phone: "(801) 555-0199", contactBy: "email" }));
    expect(appointment.clientId).toBe(corinne.id);
    const [after] = await ctx.db.select().from(clients).where(eq(clients.id, corinne.id));
    expect(after).toEqual(corinne);
  });

  it("never runs the clock backwards when an older page skips after a newer one", async () => {
    const { ctx } = await fresh();
    const tuesday8am = await skipAhead(ctx, "tomorrow");
    // A second tab still showing Monday 9:00 AM presses "Skip 20 minutes".
    await skipAhead(ctx, "20min");
    expect(await ensureSandbox(db, ctx.sandboxId, REAL_NOW)).toEqual(tuesday8am);
  });

  it("uses the real clock, not a stale page's, when that page cancels", async () => {
    const { ctx, naomi } = await fresh();
    await skipAhead(ctx, "tomorrow");
    // The stale tab cancels at what it thinks is Monday 9:00 AM. The offer must be timed from Tuesday 8:00 AM.
    const opening = await cancel(ctx, (await appointmentAt(ctx, naomi.id, TUESDAY_3PM)).id, "practice");
    const offer = await liveOffer(ctx, opening.id);
    expect(fmtDateTime(offer.sentAt)).toBe("Tue, Nov 17 at 8:00 AM");
    expect(fmtDateTime(offer.expiresAt)).toBe("Tue, Nov 17 at 8:20 AM");
  });
});

describe("housekeeping", () => {
  it("removes sandboxes past their lifetime when a new visitor arrives", async () => {
    const own = await createEmbeddedDb();
    await ensureSandbox(own, "old", new Date("2026-11-10T00:00:00Z"));
    await ensureSandbox(own, "recent", new Date("2026-11-12T12:00:00Z"));
    await ensureSandbox(own, "new", new Date("2026-11-13T00:00:00Z"));
    const { sandboxes: table } = await import("@/db/schema");
    expect((await own.select({ id: table.id }).from(table)).map((row) => row.id).sort()).toEqual(["new", "recent"]);
    expect(await own.select().from(appointments).where(eq(appointments.sandboxId, "old"))).toHaveLength(0);
  }, 60_000);
});
