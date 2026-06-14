/**
 * One-off: re-classify all of a user's stored events against the current rules
 * (e.g. after adding new domain rules) and recompute affected days.
 * Usage: npx tsx scripts/reclassify.ts [email]
 */
import { prisma } from "../src/lib/prisma";
import { reclassifyDomain } from "../src/lib/overrides";

async function main() {
  const email = process.argv[2] || "demo@focuslens.app";
  const user = await prisma.user.findFirst({ where: { email } });
  if (!user) throw new Error(`no user ${email}`);

  const domains = await prisma.browsingEvent.findMany({
    where: { userId: user.id },
    distinct: ["domain"],
    select: { domain: true },
  });
  console.log(`Reclassifying ${domains.length} domains for ${email} …`);
  for (const { domain } of domains) {
    const n = await reclassifyDomain(user.id, domain);
    console.log(`  ${domain}: ${n} events`);
  }
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
