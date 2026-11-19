import { asc, count, eq, inArray, lt, sql } from "drizzle-orm";
import type { Db } from "./client";
import { sandboxes } from "./schema";
import { demoStart, seedSandbox } from "./seed";

const SANDBOX_LIFETIME_MS = 48 * 3600_000;
/** The most sandboxes kept at once. Past this, the oldest make room for new visitors. */
export const MAX_SANDBOXES = 300;
/** Housekeeping removes at most this many per new visitor, so nobody's first page waits on a big clean-up. */
const PURGE_BATCH = 20;

/**
 * Makes sure this visitor has a seeded sandbox, and returns its demo clock.
 * Safe to call on every request: after the first call it is a single
 * primary-key lookup.
 */
export async function ensureSandbox(db: Db, sandboxId: string, realNow = new Date()): Promise<Date> {
  return (await openSandbox(db, sandboxId, realNow)).clock;
}

/** The same, also returning the practice name the visitor typed (null while the demo shows the fictional practice). */
export async function openSandbox(db: Db, sandboxId: string, realNow = new Date()): Promise<{ clock: Date; practiceName: string | null }> {
  const [existing] = await db.select({ clock: sandboxes.clockAt, practiceName: sandboxes.practiceName }).from(sandboxes).where(eq(sandboxes.id, sandboxId));
  if (existing) return existing;

  // Insert and seed in one transaction. A concurrent request for the same new
  // visitor waits on the insert, then sees the finished sandbox and skips seeding.
  const clock = demoStart(realNow);
  await db.transaction(async (tx) => {
    const inserted = await tx.insert(sandboxes).values({ id: sandboxId, createdAt: realNow, clockAt: clock, clockStartAt: clock }).onConflictDoNothing().returning();
    if (inserted.length) await seedSandbox({ db: tx as unknown as Db, sandboxId, clock });
  });

  await purge(db, sandboxId, realNow);
  return { clock, practiceName: null };
}

/** The practice name a visitor typed, without creating anything. Null for the fictional practice or an unknown sandbox. */
export async function practiceNameOf(db: Db, sandboxId: string): Promise<string | null> {
  const [row] = await db.select({ practiceName: sandboxes.practiceName }).from(sandboxes).where(eq(sandboxes.id, sandboxId));
  return row?.practiceName ?? null;
}

/** Stores the visitor's practice name, or null to go back to the fictional practice. */
export async function setPracticeName(db: Db, sandboxId: string, practiceName: string | null): Promise<void> {
  await db.update(sandboxes).set({ practiceName }).where(eq(sandboxes.id, sandboxId));
}

/**
 * What a device compares to know whether the sandbox changed since it last
 * looked. It includes the creation time, so a reset reads as a change too.
 */
export type SandboxStamp = string;

const stampOf = (row: { createdAt: Date; revision: number }): SandboxStamp => `${row.createdAt.getTime()}.${row.revision}`;

/** Records that the visitor changed something. Returns the new stamp, or null if the sandbox is gone. */
export async function touchSandbox(db: Db, sandboxId: string): Promise<SandboxStamp | null> {
  const [row] = await db
    .update(sandboxes)
    .set({ revision: sql`${sandboxes.revision} + 1` })
    .where(eq(sandboxes.id, sandboxId))
    .returning({ createdAt: sandboxes.createdAt, revision: sandboxes.revision });
  return row ? stampOf(row) : null;
}

/** The current stamp, read with one primary-key lookup. Null if the sandbox does not exist. */
export async function sandboxStamp(db: Db, sandboxId: string): Promise<SandboxStamp | null> {
  const [row] = await db.select({ createdAt: sandboxes.createdAt, revision: sandboxes.revision }).from(sandboxes).where(eq(sandboxes.id, sandboxId));
  return row ? stampOf(row) : null;
}

/**
 * Housekeeping piggybacks on new visitors, so no scheduled job is needed.
 * Removes sandboxes past their lifetime, then enforces the cap, which bounds
 * the size of the database however many visitors (or scripts) turn up.
 */
async function purge(db: Db, keep: string, realNow: Date): Promise<void> {
  const remove = async (ids: { id: string }[]) => {
    const others = ids.map((row) => row.id).filter((id) => id !== keep);
    if (others.length) await db.delete(sandboxes).where(inArray(sandboxes.id, others));
  };

  const expired = new Date(realNow.getTime() - SANDBOX_LIFETIME_MS);
  await remove(await db.select({ id: sandboxes.id }).from(sandboxes).where(lt(sandboxes.createdAt, expired)).orderBy(asc(sandboxes.createdAt)).limit(PURGE_BATCH));

  const [{ total }] = await db.select({ total: count() }).from(sandboxes);
  if (total > MAX_SANDBOXES) {
    await remove(await db.select({ id: sandboxes.id }).from(sandboxes).orderBy(asc(sandboxes.createdAt)).limit(Math.min(total - MAX_SANDBOXES, PURGE_BATCH)));
  }
}

/** Puts the sample data back as it was, which also puts the fictional practice's name back. */
export async function resetSandbox(db: Db, sandboxId: string, realNow = new Date()): Promise<void> {
  await db.delete(sandboxes).where(eq(sandboxes.id, sandboxId));
  await ensureSandbox(db, sandboxId, realNow);
}
