import { asc, count, eq, inArray, lt } from "drizzle-orm";
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
  const [existing] = await db.select({ clockAt: sandboxes.clockAt }).from(sandboxes).where(eq(sandboxes.id, sandboxId));
  if (existing) return existing.clockAt;

  // Insert and seed in one transaction. A concurrent request for the same new
  // visitor waits on the insert, then sees the finished sandbox and skips seeding.
  const clock = demoStart(realNow);
  await db.transaction(async (tx) => {
    const inserted = await tx.insert(sandboxes).values({ id: sandboxId, createdAt: realNow, clockAt: clock, clockStartAt: clock }).onConflictDoNothing().returning();
    if (inserted.length) await seedSandbox({ db: tx as unknown as Db, sandboxId, clock });
  });

  await purge(db, sandboxId, realNow);
  return clock;
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

export async function resetSandbox(db: Db, sandboxId: string, realNow = new Date()): Promise<void> {
  await db.delete(sandboxes).where(eq(sandboxes.id, sandboxId));
  await ensureSandbox(db, sandboxId, realNow);
}
