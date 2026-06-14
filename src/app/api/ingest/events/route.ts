import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeDomain } from "@/lib/classify";
import { recomputeDay } from "@/lib/analytics/persist";
import { getOverrideMap, resolveCategory } from "@/lib/overrides";
import { ingestBatchSchema } from "@/lib/validation";
import { dayKey, startOfDay } from "@/lib/utils";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-fl-token",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/**
 * Ingest a batch of browsing events from the extension.
 * Auth: the per-user ingest token in the `x-fl-token` header.
 */
export async function POST(req: NextRequest) {
  const token = req.headers.get("x-fl-token");
  if (!token) {
    return NextResponse.json({ error: "missing token" }, { status: 401, headers: CORS });
  }

  const user = await prisma.user.findUnique({
    where: { ingestToken: token },
    select: { id: true, mode: true },
  });
  if (!user) {
    return NextResponse.json({ error: "invalid token" }, { status: 401, headers: CORS });
  }

  const json = await req.json().catch(() => null);
  const parsed = ingestBatchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid payload", details: parsed.error.flatten() },
      { status: 400, headers: CORS },
    );
  }

  const overrides = await getOverrideMap(user.id);
  const rows = parsed.data.events.map((e) => {
    const domain = normalizeDomain(e.url);
    return {
      userId: user.id,
      url: e.url,
      title: e.title || domain,
      domain,
      category: resolveCategory({ url: e.url, title: e.title, domain }, overrides),
      startTime: new Date(e.startTime),
      endTime: new Date(e.endTime),
      duration: e.duration,
      tabId: e.tabId,
      windowId: e.windowId,
      endReason: e.endReason,
      fromDomain: e.fromDomain,
    };
  });

  await prisma.browsingEvent.createMany({ data: rows });

  // Recompute analytics for every day touched by this batch.
  const touchedDays = new Map<string, Date>();
  for (const r of rows) {
    const key = dayKey(r.startTime);
    if (!touchedDays.has(key)) touchedDays.set(key, startOfDay(r.startTime));
  }
  for (const day of touchedDays.values()) {
    await recomputeDay(user.id, day);
  }

  return NextResponse.json(
    { ok: true, ingested: rows.length, days: [...touchedDays.keys()] },
    { headers: CORS },
  );
}
