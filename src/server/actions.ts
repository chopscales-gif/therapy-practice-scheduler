"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db/client";
import { resetSandbox } from "@/db/sandbox";
import { appointments, sandboxes, therapists } from "@/db/schema";
import { addDays, dayOf, mondayOf, zonedTime } from "@/lib/time";
import { getCtx, sandboxIdFromCookie } from "./session";
import { WorkflowError, book, cancel, cancelByToken, confirm, joinWaitlist, respondToOffer, skipAhead, type ClockStep, type Ctx } from "./workflow";

/**
 * Server actions: the thin layer between the screens and the workflow. Each one
 * validates its input, runs a workflow function in the visitor's sandbox, and
 * returns a plain result the screen can show.
 */

/** `goto` is where the screen should go next, when the action decides that. */
export type ActionResult = { ok: true; goto?: string } | { ok: false; error: string };

async function run(work: (ctx: Ctx) => Promise<string | void>): Promise<ActionResult> {
  let goto: string | void;
  try {
    goto = await work(await getCtx());
  } catch (error) {
    if (error instanceof WorkflowError) return { ok: false, error: error.message };
    console.error(error);
    return { ok: false, error: "Something went wrong on our side. Try again, or reset the demo from the bar at the top." };
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
    if (!target) throw new WorkflowError("That appointment has already been cancelled. Its timeline is under Cancellations, or use Reset demo to run it again.");
    const opening = await cancel(ctx, target.id, "client");
    return `/practice/cancellations#${opening.id}`;
  });
}

export async function resetDemoAction(): Promise<void> {
  const sandboxId = await sandboxIdFromCookie();
  await resetSandbox(await getDb(), sandboxId);
  revalidatePath("/", "layout");
  redirect("/");
}
