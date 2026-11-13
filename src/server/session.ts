import { cookies } from "next/headers";
import { getDb } from "@/db/client";
import { ensureSandbox } from "@/db/sandbox";
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
 * Database, sandbox and clock for the current request. Seeds the sandbox the
 * first time a visitor's cookie comes back. `now` is the sandbox's demo clock.
 */
export async function getCtx(): Promise<Ctx> {
  const sandboxId = await sandboxIdFromCookie();
  const db = await getDb();
  return { db, sandboxId, now: await ensureSandbox(db, sandboxId) };
}

/** The demo clock, or null for a visitor with no sandbox (cookies blocked). Never touches the database for them. */
export async function demoClock(): Promise<Date | null> {
  if (!(await sandboxIdOrNull())) return null;
  return (await getCtx()).now;
}
