/**
 * Local PostgreSQL for development — no Docker, no sudo.
 *
 * Runs a real PostgreSQL server in userspace via embedded-postgres, with the
 * same credentials the docker-compose stack uses, so DATABASE_URL works
 * unchanged:
 *   postgresql://focuslens:focuslens@localhost:5432/focuslens
 *
 * Usage:
 *   node scripts/dev-db.mjs          # start (stays in foreground; Ctrl-C to stop)
 *   npm run db:start                 # same, intended to run in its own terminal
 *
 * Data persists in ./.postgres-data. Delete that folder for a clean slate.
 */
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const dataDir = resolve(process.cwd(), ".postgres-data");
const fresh = !existsSync(dataDir);

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "focuslens",
  password: "focuslens",
  port: 5432,
  persistent: true,
});

async function main() {
  if (fresh) {
    console.log("Initialising a fresh PostgreSQL cluster …");
    await pg.initialise();
  }
  await pg.start();

  if (fresh) {
    try {
      await pg.createDatabase("focuslens");
      console.log('Created database "focuslens".');
    } catch (e) {
      console.warn("createDatabase:", e?.message ?? e);
    }
  }

  console.log("✓ PostgreSQL ready on postgresql://focuslens:focuslens@localhost:5432/focuslens");
  console.log("  (leave this running; press Ctrl-C to stop)");

  const shutdown = async () => {
    console.log("\nStopping PostgreSQL …");
    try {
      await pg.stop();
    } finally {
      process.exit(0);
    }
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Keep the process alive so the server keeps running.
  setInterval(() => {}, 1 << 30);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
