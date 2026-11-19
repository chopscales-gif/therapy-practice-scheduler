"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import qrcode from "qrcode-generator";
import { z } from "zod";
import { getDb } from "@/db/client";
import { resetSandbox, sandboxStamp, setPracticeName, touchSandbox, type SandboxStamp } from "@/db/sandbox";
import { appointments, sandboxes, therapists } from "@/db/schema";
import { cleanPracticeName } from "@/lib/practice";
import { addDays, dayOf, mondayOf, zonedTime } from "@/lib/time";
import { SANDBOX_COOKIE_OPTIONS, SEEN_COOKIE } from "./cookie";
import { FOOL_KINDS, foolRequest, type FoolKind } from "./fool";
import { createHandoff, landingPath } from "./handoff";
import { scenario } from "./queries";
import { getCtx, sandboxIdFromCookie } from "./session";
import { WorkflowError, book, cancel, cancelByToken, confirm, joinWaitlist, respondToOffer, skipAhead, type ClockStep, type Ctx } from "./workflow";

/**
 * Server actions: the thin layer between the screens and the workflow. Each one
 * validates its input, runs a workflow function in the visitor's sandbox, and
 * returns a plain result the screen can show.
 */

/** `goto` is where the screen should go next, when the action decides that. */
export type ActionResult = { ok: true; goto?: string } | { ok: false; error: string };

/**
 * Counts the change, so a second device in the same sandbox knows to redraw,
 * and notes that this device has already seen it, so it is not told to.
 */
async function recordChange(ctx: Pick<Ctx, "db" | "sandboxId">): Promise<void> {
  await markSeen(await touchSandbox(ctx.db, ctx.sandboxId));
}

async function markSeen(stamp: SandboxStamp | null): Promise<void> {
  if (stamp) (await cookies()).set(SEEN_COOKIE, stamp, SANDBOX_COOKIE_OPTIONS);
}

async function run(work: (ctx: Ctx) => Promise<string | void>): Promise<ActionResult> {
  let goto: string | void;
  try {
    const ctx = await getCtx();
    goto = await work(ctx);
    await recordChange(ctx);
  } catch (error) {
    if (error instanceof WorkflowError) return { ok: false, error: error.message };
    console.error(error);
    return { ok: false, error: "Something went wrong on our side. Try again, or use Reset in the bar at the top." };
  }
  revalidatePath("/", "layout");
  return goto ? { ok: true, goto } : { ok: true };
}

const id = z.uuid();
const linkToken = z.string().min(10).max(64);
const person = {
  name: z.string().trim().min(2).max(80),
  email: z.email().max(120),
  phone: z
    .string()
    .trim()
    .min(7)
    .max(30)
    .regex(/^[0-9()+\-. ]+$/),
  contactBy: z.enum(["text", "email"]),
};
const PERSON_ERROR = "Check your name, email address and phone number.";

const booking = z.object({ ...person, therapistId: id, startsAt: z.iso.datetime(), mode: z.enum(["office", "video"]) });

export async function bookAction(input: z.input<typeof booking>): Promise<ActionResult> {
  const parsed = booking.safeParse(input);
  if (!parsed.success) return { ok: false, error: PERSON_ERROR };
  return run(async (ctx) => {
    const appointment = await book(ctx, { ...parsed.data, startsAt: new Date(parsed.data.startsAt) });
    return `/a/${appointment.token}`;
  });
}

const waitlist = z.object({
  ...person,
  therapistId: id.nullable(),
  days: z.array(z.number().int().min(1).max(5)).max(5),
  parts: z.array(z.enum(["morning", "afternoon", "evening"])).max(3),
  mode: z.enum(["office", "video", "either"]),
});

export async function joinWaitlistAction(input: z.input<typeof waitlist>): Promise<ActionResult> {
  const parsed = waitlist.safeParse(input);
  if (!parsed.success) return { ok: false, error: PERSON_ERROR };
  return run((ctx) => joinWaitlist(ctx, parsed.data));
}

export async function confirmAction(token: string): Promise<ActionResult> {
  if (!linkToken.safeParse(token).success) return { ok: false, error: "That appointment could not be found." };
  return run((ctx) => confirm(ctx, token));
}

/** The client cancels from their own link. */
export async function cancelByTokenAction(token: string): Promise<ActionResult> {
  if (!linkToken.safeParse(token).success) return { ok: false, error: "That appointment could not be found." };
  return run(async (ctx) => {
    await cancelByToken(ctx, token);
  });
}

/** The front desk cancels, then lands on the timeline of the time it freed. */
export async function cancelAction(appointmentId: string): Promise<ActionResult> {
  if (!id.safeParse(appointmentId).success) return { ok: false, error: "That appointment could not be found." };
  return run(async (ctx) => {
    const opening = await cancel(ctx, appointmentId, "practice");
    return `/practice/cancellations#${opening.id}`;
  });
}

export async function respondToOfferAction(token: string, answer: "accept" | "decline"): Promise<ActionResult> {
  const parsed = z.object({ token: linkToken, answer: z.enum(["accept", "decline"]) }).safeParse({ token, answer });
  if (!parsed.success) return { ok: false, error: "That offer could not be found." };
  return run((ctx) => respondToOffer(ctx, parsed.data.token, parsed.data.answer));
}

export async function skipAheadAction(step: ClockStep): Promise<ActionResult> {
  if (step !== "20min" && step !== "tomorrow") return { ok: false, error: "That is not a step the demo clock can take." };
  return run(async (ctx) => {
    await skipAhead(ctx, step);
  });
}

/**
 * The one-click scenario: cancel Tuesday's 3:00 PM with the first therapist,
 * the appointment the sample waitlist is arranged around.
 */
export async function cancelScenarioAction(): Promise<ActionResult> {
  return run(async (ctx) => {
    const [sandbox] = await ctx.db.select().from(sandboxes).where(eq(sandboxes.id, ctx.sandboxId));
    const startsAt = zonedTime(addDays(mondayOf(dayOf(sandbox.clockStartAt)), 1), 15);
    const [target] = await ctx.db
      .select({ id: appointments.id })
      .from(appointments)
      .innerJoin(therapists, eq(therapists.id, appointments.therapistId))
      .where(
        and(eq(appointments.sandboxId, ctx.sandboxId), eq(therapists.position, 0), eq(appointments.startsAt, startsAt), inArray(appointments.status, ["booked", "confirmed"])),
      );
    if (!target) throw new WorkflowError("That appointment has already been cancelled. Its timeline is under Cancellations, or use Reset in the bar at the top to run it again.");
    const opening = await cancel(ctx, target.id, "client");
    return `/practice/cancellations#${opening.id}`;
  });
}

export async function resetDemoAction(): Promise<void> {
  const sandboxId = await sandboxIdFromCookie();
  const db = await getDb();
  await resetSandbox(db, sandboxId);
  await markSeen(await sandboxStamp(db, sandboxId));
  revalidatePath("/", "layout");
  redirect("/");
}

/**
 * Shows the visitor's own practice name in place of the fictional one, or puts
 * the fictional one back when given null. Only the name changes: the people,
 * the phone number and the sample data stay invented.
 */
export async function setPracticeNameAction(raw: string | null): Promise<ActionResult> {
  if (raw !== null && typeof raw !== "string") return { ok: false, error: "That name could not be read." };
  const cleaned = raw === null ? null : cleanPracticeName(raw.slice(0, 200));
  if (cleaned && !cleaned.ok) return { ok: false, error: cleaned.error };
  return run((ctx) => setPracticeName(ctx.db, ctx.sandboxId, cleaned ? cleaned.name : null));
}

export type HandoffView = {
  /** The join link, on the address this visitor is using. */
  url: string;
  /** The link as a QR code, one string of 1s and 0s per row. Null where a phone could not reach the address. */
  qr: string[] | null;
  /** Milliseconds since 1970 at which the link stops working. */
  expiresAt: number;
};

export type HandoffResult = { ok: true; view: HandoffView } | { ok: false; error: string };

const LOCAL_HOST = /^(localhost|127(\.\d+){3}|\[::1\])(:\d+)?$/i;

/** Makes a short-lived link that opens this visitor's sandbox, on the given page, on another device. */
export async function createHandoffAction(path: string): Promise<HandoffResult> {
  const landing = typeof path === "string" ? landingPath(path) : null;
  if (!landing) return { ok: false, error: "This page cannot be opened on a phone." };
  try {
    const ctx = await getCtx();
    // Real time, not the demo clock: the link lasts 15 minutes however far the visitor skips ahead.
    const handoff = await createHandoff(ctx.db, ctx.sandboxId, landing, new Date());
    if (!handoff) return { ok: false, error: "The demo data was reset. Reload the page and try again." };

    // The link is built from the address the visitor's own browser used, so it works wherever the demo is hosted.
    const incoming = await headers();
    const host = (incoming.get("x-forwarded-host") ?? incoming.get("host") ?? "").split(",")[0].trim();
    if (!/^[A-Za-z0-9.-]+(:\d+)?$|^\[[0-9a-f:]+\](:\d+)?$/i.test(host)) return { ok: false, error: "A link could not be made for this address." };
    const local = LOCAL_HOST.test(host);
    const forwarded = incoming.get("x-forwarded-proto")?.split(",")[0].trim();
    const protocol = forwarded === "http" || forwarded === "https" ? forwarded : local || process.env.NODE_ENV !== "production" ? "http" : "https";
    const url = `${protocol}://${host}/join/${handoff.token}`;

    let qr: string[] | null = null;
    // A phone cannot open an address on the visitor's own computer, so no code is drawn for one.
    if (!local) {
      const code = qrcode(0, "M");
      code.addData(url);
      code.make();
      const size = code.getModuleCount();
      qr = Array.from({ length: size }, (_, row) => Array.from({ length: size }, (_, column) => (code.isDark(row, column) ? "1" : "0")).join(""));
    }
    return { ok: true, view: { url, qr, expiresAt: handoff.expiresAt.getTime() } };
  } catch (error) {
    console.error(error);
    return { ok: false, error: "The link could not be made. Try again." };
  }
}

export type StoryStart = { ok: true; cancels: string } | { ok: false; error: string };

/**
 * Checks that "Play the story" can run to its end: the appointment it has
 * cancelled must still be there, and early enough to be offered to the waitlist.
 */
export async function startStoryAction(): Promise<StoryStart> {
  try {
    const state = await scenario(await getCtx());
    if (!state || state.state !== "ready") return { ok: false, error: "The story has already been played in this copy of the demo. Use Reset to play it again." };
    return { ok: true, cancels: state.clientName.split(" ")[0] };
  } catch (error) {
    if (error instanceof WorkflowError) return { ok: false, error: error.message };
    console.error(error);
    return { ok: false, error: "The story could not start. Try again." };
  }
}

/** "Try to fool it": asks the real workflow for a booking the screens never offer, and reports what it says. */
export async function foolAction(kind: FoolKind): Promise<ActionResult> {
  if (!FOOL_KINDS.includes(kind)) return { ok: false, error: "That is not something this demo can try." };
  return run(async (ctx) => {
    const request = await foolRequest(ctx, kind);
    if (!request) throw new WorkflowError("There is nothing in this copy of the sample data to try that with. Use Reset in the bar at the top.");
    await book(ctx, request);
  });
}
