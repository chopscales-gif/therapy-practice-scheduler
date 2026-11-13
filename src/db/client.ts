import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

/** The same query API whichever driver is underneath. */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

const MIGRATIONS = path.join(process.cwd(), "drizzle");

/**
 * With DATABASE_URL set, connects to that Postgres (the hosted demo uses Neon)
 * and expects `npm run db:migrate` to have been run.
 * Without it, starts an embedded Postgres (PGlite) stored in .data/, and
 * migrates it on first use, so the app runs locally with no database to install.
 */
async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { default: postgres } = await import("postgres");
    const { drizzle } = await import("drizzle-orm/postgres-js");
    return drizzle(postgres(url, { max: 5, prepare: false }), { schema }) as unknown as Db;
  }
  return createEmbeddedDb(path.join(process.cwd(), ".data", "pglite"));
}

/** Embedded Postgres. Pass no directory for a throwaway in-memory database (used by tests). */
export async function createEmbeddedDb(dataDir?: string): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  if (dataDir) {
    const { mkdir } = await import("node:fs/promises");
    await mkdir(path.dirname(dataDir), { recursive: true });
  }
  const db = drizzle(new PGlite(dataDir), { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS });
  return db as unknown as Db;
}

// One connection per server process, surviving hot reloads in development.
const globalForDb = globalThis as unknown as { __db?: Promise<Db> };

export function getDb(): Promise<Db> {
  globalForDb.__db ??= connect();
  return globalForDb.__db;
}
