import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAIEnabled } from "@/lib/ai";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, image: true, mode: true, ingestToken: true, onboarded: true },
  });
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({
    ...user,
    aiEnabled: isAIEnabled(),
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  });
}
