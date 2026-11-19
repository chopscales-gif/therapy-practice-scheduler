import { cookies } from "next/headers";
import { getDb } from "@/db/client";
import { openSandbox, practiceNameOf } from "@/db/sandbox";
import { DEMO_PRACTICE, practiceFor, type Practice } from "@/lib/practice";
import { SANDBOX_COOKIE } from "./cookie";
import { WorkflowError, type Ctx } from "./workflow";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

async function sandboxIdOrNull(): Promise<string | null> {
  const id = (await cookies()).get(SANDBOX_COOKIE)?.value;
  return id && UUID.test(id) ? id : null;
}

/** The id in the visitor's cookie. The proxy sets it, so it is only missing if cookies are blocked. */
export async function sandboxIdFromCookie(): Promise<string> {
  const id = await sandboxIdOrNull();
  if (!id) throw new WorkflowError("This demo needs cookies switched on to keep your sample data separate from other visitors.");
  return id;
}

/**
 * Database, sandbox, clock and practice name for the current request. Seeds
 * the sandbox the first time a visitor's cookie comes back. `now` is the
 * sandbox's demo clock.
 */
export async function getCtx(): Promise<Ctx & { practice: Practice }> {
  const sandboxId = await sandboxIdFromCookie();
  const db = await getDb();
  const { clock, practiceName } = await openSandbox(db, sandboxId);
  return { db, sandboxId, now: clock, practice: practiceFor(practiceName) };
}

/**
 * The practice to show in the parts of the page drawn outside a screen (the
 * demo bar, the not-found page). Unlike getCtx it never creates a sandbox, so
 * a visitor without a cookie, or a crawler, costs nothing.
 */
export async function currentPractice(): Promise<Practice> {
  const id = await sandboxIdOrNull();
  if (!id) return DEMO_PRACTICE;
  return practiceFor(await practiceNameOf(await getDb(), id));
}

/** The demo clock, or null for a visitor with no sandbox (cookies blocked). Never touches the database for them. */
export async function demoClock(): Promise<Date | null> {
  if (!(await sandboxIdOrNull())) return null;
  return (await getCtx()).now;
}
