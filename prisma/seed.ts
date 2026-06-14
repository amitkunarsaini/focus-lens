/**
 * Seed script — creates the demo user so you can sign in.
 *
 * Demo *data* is no longer stored in the database: it's generated in-memory by
 * src/lib/demo-data.ts and shown whenever the account is in DEMO mode. This
 * keeps the database holding only real (live) attention data.
 *
 * Run with: npm run db:seed
 */
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

async function main() {
  const email = "demo@focuslens.app";
  const password = await bcrypt.hash("demo1234", 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Demo User", password, onboarded: true, mode: "DEMO" },
  });

  console.log(`Demo user ready: ${user.email}`);
  console.log("Sign in with:");
  console.log("  email:    demo@focuslens.app");
  console.log("  password: demo1234");
  console.log("It starts in DEMO mode (30 days of in-memory sample data).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
