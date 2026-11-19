import { randomBytes } from "node:crypto";
import { and, desc, eq, lt } from "drizzle-orm";
import type { Db } from "@/db/client";
import { sandboxStamp, type SandboxStamp } from "@/db/sandbox";
import { handoffs, sandboxes } from "@/db/schema";

/**
 * Moving a visitor to a second device. The laptop asks for a short-lived link,
 * shows it as a QR code, and the phone that opens it joins the same sandbox.
 * While a link is live, each device asks every few seconds whether the other
 * one changed anything. Every time here is real time, never the demo clock.
 */

/** A join link works for this long. The same window is how long the two devices keep each other up to date. */
export const HANDOFF_LIFETIME_MS = 15 * 60_000;
/** Links kept per sandbox, so a script cannot fill the table. */
const MAX_HANDOFFS_PER_SANDBOX = 12;

/** Pages a second device may land on. Anything else, including another site, is refused. */
const LANDING = /^\/(waitlist|about|practice(\/[a-z0-9/-]*)?|(a|offer)\/[A-Za-z0-9_-]{10,64})?$/;

/** The path if it is one of this app's own pages, otherwise null. Query strings are dropped. */
export function landingPath(raw: string): string | null {
  const path = raw.split(/[?#]/)[0];
  return path.length <= 200 && LANDING.test(path) ? path : null;
}

export type Handoff = { token: string; expiresAt: Date };

/** Makes a join link for a sandbox that exists. Returns null for one that does not, so a link never points at nothing. */
export async function createHandoff(db: Db, sandboxId: string, path: string, now = new Date()): Promise<Handoff | null> {
  const [sandbox] = await db.select({ id: sandboxes.id }).from(sandboxes).where(eq(sandboxes.id, sandboxId));
  if (!sandbox) return null;

  // Housekeeping rides along: drop this visitor's expired links, and the oldest beyond the cap.
  await db.delete(handoffs).where(and(eq(handoffs.sandboxId, sandboxId), lt(handoffs.createdAt, new Date(now.getTime() - HANDOFF_LIFETIME_MS))));
  const live = await db.select({ token: handoffs.token }).from(handoffs).where(eq(handoffs.sandboxId, sandboxId)).orderBy(desc(handoffs.createdAt));
  for (const extra of live.slice(MAX_HANDOFFS_PER_SANDBOX - 1)) await db.delete(handoffs).where(eq(handoffs.token, extra.token));

  // 144 random bits. The link carries only this, never the sandbox id.
  const token = randomBytes(18).toString("base64url");
  await db.insert(handoffs).values({ token, sandboxId, path, createdAt: now });
  return { token, expiresAt: new Date(now.getTime() + HANDOFF_LIFETIME_MS) };
}

/**
 * Where a join link leads, or null if it is unknown or older than its lifetime.
 * A link can be opened more than once while it is live, so a phone's link
 * preview (which fetches the address first) does not use it up.
 */
export async function redeemHandoff(db: Db, token: string, now = new Date()): Promise<{ sandboxId: string; path: string } | null> {
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(token)) return null;
  const [row] = await db.select().from(handoffs).where(eq(handoffs.token, token));
  if (!row) return null;
  const age = now.getTime() - row.createdAt.getTime();
  if (age < 0 || age > HANDOFF_LIFETIME_MS) return null;
  return { sandboxId: row.sandboxId, path: landingPath(row.path) ?? "/" };
}

export type ChangeCheck = {
  /** The sandbox's state now. Null if it does not exist. */
  stamp: SandboxStamp | null;
  /** True when the device last drew an earlier state. */
  changed: boolean;
  /** When the device should stop asking: the end of the newest live join link. Null when there is none. */
  until: Date | null;
};

/**
 * The cheap question a device asks while a hand-off is live: has anything
 * changed since the state I last drew? Two primary-key-sized reads, no seeding.
 */
export async function checkForChanges(db: Db, sandboxId: string, seen: string | undefined, now = new Date()): Promise<ChangeCheck> {
  const stamp = await sandboxStamp(db, sandboxId);
  if (!stamp) return { stamp: null, changed: false, until: null };
  const [newest] = await db
    .select({ createdAt: handoffs.createdAt })
    .from(handoffs)
    .where(eq(handoffs.sandboxId, sandboxId))
    .orderBy(desc(handoffs.createdAt))
    .limit(1);
  const expires = newest ? new Date(newest.createdAt.getTime() + HANDOFF_LIFETIME_MS) : null;
  return {
    stamp,
    // A device that has not asked before has nothing to compare, so it is not told to redraw.
    changed: seen !== undefined && seen !== stamp,
    until: expires && expires > now ? expires : null,
  };
}
