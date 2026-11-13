/** Applies pending migrations to the Postgres named by DATABASE_URL. Run before the hosted build. */
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log("DATABASE_URL is not set. Nothing to migrate: the embedded database migrates itself on first use.");
    return;
  }
  const client = postgres(url, { max: 1, prepare: false });
  await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
  await client.end();
  console.log("Migrations applied.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
