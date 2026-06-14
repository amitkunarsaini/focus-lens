import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeDomain } from "@/lib/classify";
import { reclassifyDomain } from "@/lib/overrides";

const CATEGORY_VALUES = [
  "Work", "Learning", "Development", "Research", "Documentation",
  "Communication", "News", "Entertainment", "SocialMedia", "Shopping", "Uncategorized",
] as const;

const upsertSchema = z.object({
  domain: z.string().min(1).max(255),
  category: z.enum(CATEGORY_VALUES),
});

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const overrides = await prisma.categoryOverride.findMany({
    where: { userId },
    orderBy: { domain: "asc" },
  });
  return NextResponse.json({ overrides });
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = upsertSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const domain = normalizeDomain(parsed.data.domain);

  await prisma.categoryOverride.upsert({
    where: { userId_domain: { userId, domain } },
    create: { userId, domain, category: parsed.data.category },
    update: { category: parsed.data.category },
  });

  // Apply retroactively to existing events + recompute affected days.
  const reclassified = await reclassifyDomain(userId, domain);
  return NextResponse.json({ ok: true, domain, reclassified }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const raw = req.nextUrl.searchParams.get("domain");
  if (!raw) return NextResponse.json({ error: "domain required" }, { status: 400 });
  const domain = normalizeDomain(raw);

  await prisma.categoryOverride.deleteMany({ where: { userId, domain } });
  // Revert events on this domain back to rule-based classification.
  const reclassified = await reclassifyDomain(userId, domain);
  return NextResponse.json({ ok: true, domain, reclassified });
}
