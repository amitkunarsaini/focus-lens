import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Switch into DEMO mode. Demo data is served from an in-memory provider — this
 * writes NOTHING to the database, so your real (live) attention data is left
 * completely untouched and is restored the moment you switch back.
 */
export async function POST() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await prisma.user.update({ where: { id: userId }, data: { mode: "DEMO" } });
  return NextResponse.json({ ok: true, mode: "DEMO" });
}

/** Switch back to LIVE mode (your real extension-fed data). Non-destructive. */
export async function DELETE() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await prisma.user.update({ where: { id: userId }, data: { mode: "LIVE" } });
  return NextResponse.json({ ok: true, mode: "LIVE" });
}
