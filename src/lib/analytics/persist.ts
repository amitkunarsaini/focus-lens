import { InsightSource, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { startOfDay, addDays } from "@/lib/utils";
import { computeDailyRollup } from "./rollup";
import { buildAllInsights } from "@/lib/insights";
import { enhanceNarrative, isAIEnabled } from "@/lib/ai";
import type { EventLike } from "./types";

/**
 * Recompute and persist all derived analytics for a single (user, day).
 *
 * Idempotent: re-running replaces the day's FocusSessions, AttentionLeaks,
 * Insights, DailyAnalytics and ProductivityScore. Called after the extension
 * ingests new events. The DB only ever holds real (live) data — demo data is
 * served from an in-memory provider and never persisted.
 */
export async function recomputeDay(userId: string, day: Date) {
  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);

  const [rawEvents, goals, prevAnalytics] = await Promise.all([
    prisma.browsingEvent.findMany({
      where: { userId, startTime: { gte: dayStart, lt: dayEnd } },
      orderBy: { startTime: "asc" },
    }),
    prisma.goal.findMany({ where: { userId, active: true } }),
    prisma.dailyAnalytics.findUnique({
      where: { userId_date: { userId, date: addDays(dayStart, -1) } },
      select: { productivityScore: true },
    }),
  ]);

  const events: EventLike[] = rawEvents.map((e) => ({
    url: e.url,
    title: e.title,
    domain: e.domain,
    category: e.category,
    startTime: e.startTime,
    endTime: e.endTime,
    duration: e.duration,
  }));

  const rollup = computeDailyRollup(events, { goals });

  // ── DailyAnalytics ──────────────────────────────────────────────────────
  await prisma.dailyAnalytics.upsert({
    where: { userId_date: { userId, date: dayStart } },
    create: {
      userId,
      date: dayStart,
      ...analyticsFields(rollup),
    },
    update: analyticsFields(rollup),
  });

  // ── ProductivityScore (explainable) ───────────────────────────────────────
  await prisma.productivityScore.upsert({
    where: { userId_date: { userId, date: dayStart } },
    create: {
      userId,
      date: dayStart,
      score: rollup.productivity.score,
      focusComponent: rollup.productivity.focusComponent,
      switchingComponent: rollup.productivity.switchingComponent,
      idleComponent: rollup.productivity.idleComponent,
      categoryComponent: rollup.productivity.categoryComponent,
      goalComponent: rollup.productivity.goalComponent,
      explanation: rollup.productivity.explanation,
    },
    update: {
      score: rollup.productivity.score,
      focusComponent: rollup.productivity.focusComponent,
      switchingComponent: rollup.productivity.switchingComponent,
      idleComponent: rollup.productivity.idleComponent,
      categoryComponent: rollup.productivity.categoryComponent,
      goalComponent: rollup.productivity.goalComponent,
      explanation: rollup.productivity.explanation,
    },
  });

  // ── FocusSessions ─────────────────────────────────────────────────────────
  await prisma.focusSession.deleteMany({
    where: { userId, startTime: { gte: dayStart, lt: dayEnd } },
  });
  if (rollup.focusSessions.length) {
    await prisma.focusSession.createMany({
      data: rollup.focusSessions.map((f) => ({ userId, ...f })),
    });
  }

  // ── AttentionLeaks ──────────────────────────────────────────────────────
  await prisma.attentionLeak.deleteMany({
    where: { userId, startTime: { gte: dayStart, lt: dayEnd } },
  });
  if (rollup.leaks.length) {
    await prisma.attentionLeak.createMany({
      data: rollup.leaks.map((l) => ({ userId, ...l })),
    });
  }

  // ── Insights (deterministic, AI-enhanced summary when enabled) ───────────
  await prisma.insight.deleteMany({
    where: { userId, date: dayStart },
  });
  const insights = buildAllInsights(rollup, prevAnalytics);
  if (insights.length) {
    // Optionally enhance only the daily-summary narrative.
    if (isAIEnabled() && insights[0]) {
      const enhanced = await enhanceNarrative({
        fallback: insights[0].body,
        data: insights[0].data,
        kind: "daily",
      });
      insights[0] = { ...insights[0], body: enhanced.text };
    }
    await prisma.insight.createMany({
      data: insights.map((i, idx) => ({
        userId,
        date: dayStart,
        type: i.type,
        source:
          idx === 0 && isAIEnabled()
            ? InsightSource.AI
            : InsightSource.DETERMINISTIC,
        severity: i.severity,
        title: i.title,
        body: i.body,
        data: i.data as Prisma.InputJsonValue,
      })),
    });
  }

  return rollup;
}

function analyticsFields(rollup: ReturnType<typeof computeDailyRollup>) {
  return {
    totalSeconds: rollup.totalSeconds,
    productiveSeconds: rollup.productiveSeconds,
    neutralSeconds: rollup.neutralSeconds,
    distractingSeconds: rollup.distractingSeconds,
    focusSeconds: rollup.focusSeconds,
    deepWorkSeconds: rollup.deepWorkSeconds,
    contextSwitches: rollup.contextSwitches,
    attentionLeaks: rollup.attentionLeaks,
    idleSeconds: rollup.idleSeconds,
    productivityScore: rollup.productivityScore,
    focusScore: rollup.focusScore,
    contextSwitchScore: rollup.contextSwitchScore,
    topCategory: rollup.topCategory,
    peakFocusStart: rollup.peakFocusStart,
    peakFocusEnd: rollup.peakFocusEnd,
    categoryBreakdown: rollup.categoryBreakdown,
    domainBreakdown: rollup.domainBreakdown,
    hourlyBreakdown: rollup.hourlyBreakdown as unknown as object,
  };
}
