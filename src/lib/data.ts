import "server-only";
import { UserMode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { startOfDay, addDays } from "@/lib/utils";
import { evaluateGoals } from "@/lib/analytics/goals";
import { computeWeeklyReport, type WeeklyDay } from "@/lib/analytics/weekly";
import type { EventLike } from "@/lib/analytics/types";
import {
  demoOverview,
  demoSeries,
  demoTimeline,
  demoFocusSessions,
  demoInsights,
  demoWeeklyReport,
  demoLatestDate,
} from "@/lib/demo-data";

/**
 * Mode-aware reads. LIVE reads the user's real DB rows; DEMO reads from the
 * in-memory demo provider (src/lib/demo-data.ts). The database only ever holds
 * real data, so switching to demo can never destroy live attention data.
 */
export async function getMode(userId: string): Promise<UserMode> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mode: true },
  });
  return user?.mode ?? UserMode.LIVE;
}

/** Most recent LIVE day with analytics, else today. */
async function liveLatestDate(userId: string): Promise<Date> {
  const latest = await prisma.dailyAnalytics.findFirst({
    where: { userId },
    orderBy: { date: "desc" },
    select: { date: true },
  });
  return latest ? startOfDay(latest.date) : startOfDay(new Date());
}

/** Mode-aware "most recent day with data" — used to anchor the timeline. */
export async function getActiveDate(userId: string): Promise<Date> {
  const mode = await getMode(userId);
  return mode === UserMode.DEMO ? demoLatestDate() : liveLatestDate(userId);
}

export async function getOverview(userId: string) {
  const mode = await getMode(userId);
  if (mode === UserMode.DEMO) return demoOverview();

  const today = await liveLatestDate(userId);
  const yesterday = addDays(today, -1);

  const [analytics, prevAnalytics, score, focusSessions, leaks, goals] =
    await Promise.all([
      prisma.dailyAnalytics.findUnique({ where: { userId_date: { userId, date: today } } }),
      prisma.dailyAnalytics.findUnique({ where: { userId_date: { userId, date: yesterday } } }),
      prisma.productivityScore.findUnique({ where: { userId_date: { userId, date: today } } }),
      prisma.focusSession.findMany({
        where: { userId, startTime: { gte: today, lt: addDays(today, 1) } },
        orderBy: { startTime: "asc" },
      }),
      prisma.attentionLeak.findMany({
        where: { userId, startTime: { gte: today, lt: addDays(today, 1) } },
        orderBy: { startTime: "asc" },
      }),
      prisma.goal.findMany({ where: { userId, active: true } }),
    ]);

  const todaysEvents = await prisma.browsingEvent.findMany({
    where: { userId, startTime: { gte: today, lt: addDays(today, 1) } },
    select: {
      url: true, title: true, domain: true, category: true,
      startTime: true, endTime: true, duration: true,
    },
  });
  const goalEval = evaluateGoals(goals, todaysEvents as EventLike[]);

  const summary = await prisma.insight.findFirst({
    where: { userId, date: today, type: "DAILY_SUMMARY" },
    orderBy: { createdAt: "desc" },
  });

  return {
    mode,
    date: today,
    analytics,
    prevAnalytics,
    score,
    focusSessions,
    leaks,
    goals,
    goalProgress: goalEval.progress,
    averageGoalProgress: goalEval.averageProgress,
    summary,
  };
}

export async function getSeries(userId: string, days: number) {
  const mode = await getMode(userId);
  if (mode === UserMode.DEMO) return demoSeries(days);

  const end = await liveLatestDate(userId);
  const start = addDays(end, -(days - 1));
  return prisma.dailyAnalytics.findMany({
    where: { userId, date: { gte: start, lte: end } },
    orderBy: { date: "asc" },
  });
}

/** Structured Weekly Intelligence Report over the last `days` of analytics. */
export async function getWeeklyReport(userId: string, days = 7) {
  const mode = await getMode(userId);
  if (mode === UserMode.DEMO) return demoWeeklyReport(days);

  const rows = await getSeries(userId, days);
  const weeklyDays: WeeklyDay[] = rows.map((d) => ({
    date: d.date,
    productivityScore: d.productivityScore,
    focusScore: d.focusScore,
    deepWorkSeconds: d.deepWorkSeconds,
    focusSeconds: d.focusSeconds,
    productiveSeconds: d.productiveSeconds,
    distractingSeconds: d.distractingSeconds,
    contextSwitches: d.contextSwitches,
    attentionLeaks: d.attentionLeaks,
    categoryBreakdown: d.categoryBreakdown as Record<string, number>,
    domainBreakdown: d.domainBreakdown as Record<string, number>,
  }));
  return computeWeeklyReport(weeklyDays);
}

export async function getTimeline(userId: string, date: Date) {
  const mode = await getMode(userId);
  if (mode === UserMode.DEMO) return demoTimeline(date);

  const start = startOfDay(date);
  const end = addDays(start, 1);
  const [events, focusSessions, leaks] = await Promise.all([
    prisma.browsingEvent.findMany({
      where: { userId, startTime: { gte: start, lt: end } },
      orderBy: { startTime: "asc" },
    }),
    prisma.focusSession.findMany({
      where: { userId, startTime: { gte: start, lt: end } },
      orderBy: { startTime: "asc" },
    }),
    prisma.attentionLeak.findMany({
      where: { userId, startTime: { gte: start, lt: end } },
      orderBy: { startTime: "asc" },
    }),
  ]);
  return { date: start, events, focusSessions, leaks };
}

export async function getFocusSessions(userId: string, days: number) {
  const mode = await getMode(userId);
  if (mode === UserMode.DEMO) return demoFocusSessions(days);

  const end = await liveLatestDate(userId);
  const start = addDays(end, -(days - 1));
  return prisma.focusSession.findMany({
    where: { userId, startTime: { gte: start, lt: addDays(end, 1) } },
    orderBy: { duration: "desc" },
  });
}

export async function getInsights(userId: string, days: number) {
  const mode = await getMode(userId);
  if (mode === UserMode.DEMO) return demoInsights(days);

  const end = await liveLatestDate(userId);
  const start = addDays(end, -(days - 1));
  return prisma.insight.findMany({
    where: { userId, date: { gte: start, lte: end } },
    orderBy: [{ date: "desc" }, { severity: "desc" }, { createdAt: "desc" }],
  });
}

export async function getUser(userId: string) {
  return prisma.user.findUnique({ where: { id: userId } });
}
