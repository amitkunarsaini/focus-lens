import "server-only";
import type {
  AttentionLeak,
  DailyAnalytics,
  FocusSession,
  Goal,
  Insight,
  ProductivityScore,
  BrowsingEvent,
} from "@prisma/client";
import { InsightSource } from "@prisma/client";
import { classify, normalizeDomain } from "@/lib/classify";
import { startOfDay, addDays, dayKey } from "@/lib/utils";
import { computeDailyRollup } from "@/lib/analytics/rollup";
import { buildAllInsights } from "@/lib/insights";
import { evaluateGoals } from "@/lib/analytics/goals";
import { computeWeeklyReport, type WeeklyDay } from "@/lib/analytics/weekly";
import type { EventLike } from "@/lib/analytics/types";

/**
 * In-memory demo dataset.
 *
 * Demo Mode never touches the database — the entire 30-day showcase is generated
 * deterministically here, run through the SAME analytics engine the live data
 * uses, and cached for the process lifetime. When the user is in DEMO mode the
 * dashboard reads from this provider; in LIVE mode it reads their real DB rows.
 * This guarantees demo data can never overwrite real attention data.
 */

const DEMO_USER = "demo";
const DAYS = 30;

// ── deterministic generator (mulberry32) ────────────────────────────────────
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Site {
  url: string;
  title: string;
}
const DEV: Site[] = [
  { url: "https://github.com/acme/web/pull/482", title: "Pull Request Review" },
  { url: "https://github.com/acme/web/issues", title: "Issues · acme/web" },
  { url: "https://localhost:3000/dashboard", title: "FocusLens — Dev" },
  { url: "https://vercel.com/acme/web/deployments", title: "Deployments — Vercel" },
];
const DOCS: Site[] = [
  { url: "https://nextjs.org/docs/app/api-reference", title: "App Router — Next.js" },
  { url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript", title: "JavaScript — MDN" },
  { url: "https://www.prisma.io/docs/orm", title: "Prisma ORM Docs" },
];
const LEARN: Site[] = [
  { url: "https://stackoverflow.com/questions/12345", title: "How to debounce in React — Stack Overflow" },
  { url: "https://www.youtube.com/watch?v=abc", title: "System Design Tutorial — Crash Course" },
  { url: "https://dev.to/article/clean-architecture", title: "Clean Architecture explained" },
];
const AI: Site[] = [
  { url: "https://chatgpt.com/c/ai-project-ideas", title: "AI Project Ideas" },
  { url: "https://claude.ai/chat/abc", title: "Refactoring help — Claude" },
];
const SOCIAL: Site[] = [
  { url: "https://www.linkedin.com/feed/", title: "LinkedIn Feed" },
  { url: "https://twitter.com/home", title: "Home / X" },
  { url: "https://www.reddit.com/r/programming", title: "r/programming" },
];
const COMMS: Site[] = [
  { url: "https://mail.google.com/mail/u/0", title: "Inbox (12) — Gmail" },
  { url: "https://web.whatsapp.com/", title: "WhatsApp" },
  { url: "https://app.slack.com/client/T01/C01", title: "acme — Slack" },
];
const ENTERTAINMENT: Site[] = [
  { url: "https://www.youtube.com/shorts/xyz", title: "Funny cat shorts" },
  { url: "https://www.netflix.com/watch/8001", title: "Netflix" },
  { url: "https://open.spotify.com/playlist/focus", title: "Deep Focus — Spotify" },
];
const NEWS: Site[] = [
  { url: "https://news.ycombinator.com/", title: "Hacker News" },
  { url: "https://www.theverge.com/tech", title: "The Verge — Tech" },
];

function pick<T>(arr: T[], r: () => number): T {
  return arr[Math.floor(r() * arr.length)];
}

interface RawEvent {
  site: Site;
  start: Date;
  duration: number;
}

function buildDay(day: Date, r: () => number, isWeekend: boolean): RawEvent[] {
  const events: RawEvent[] = [];
  let cursor = new Date(day);
  cursor.setHours(isWeekend ? 10 : 9, Math.floor(r() * 20), 0, 0);

  const push = (site: Site, minutes: number) => {
    const duration = Math.round(minutes * 60);
    events.push({ site, start: new Date(cursor), duration });
    cursor = new Date(cursor.getTime() + duration * 1000 + r() * 30_000);
  };

  const morningBlocks = isWeekend ? 2 : 5;
  for (let i = 0; i < morningBlocks; i++) {
    push(pick(DEV, r), 12 + r() * 18);
    if (r() < 0.5) push(pick(DOCS, r), 4 + r() * 10);
    if (r() < 0.4) push(pick(LEARN, r), 5 + r() * 12);
    if (r() < 0.35) push(pick(AI, r), 3 + r() * 9);
    if (r() < 0.45) push(pick(COMMS, r), 1 + r() * 3);
    if (r() < 0.3) push(pick(SOCIAL, r), 2 + r() * 5);
  }

  push(pick(COMMS, r), 6 + r() * 10);
  cursor = new Date(cursor.getTime() + (40 + r() * 30) * 60_000);

  const afternoonBlocks = isWeekend ? 1 : 4;
  for (let i = 0; i < afternoonBlocks; i++) {
    push(pick(DEV, r), 10 + r() * 20);
    if (r() < 0.4) push(pick(AI, r), 4 + r() * 8);
    if (r() < 0.5) push(pick(SOCIAL, r), 3 + r() * 8);
    if (r() < 0.4) push(pick(NEWS, r), 3 + r() * 6);
    if (r() < 0.5) push(pick(COMMS, r), 2 + r() * 4);
    if (r() < 0.3) push(pick(DOCS, r), 5 + r() * 8);
  }

  cursor = new Date(cursor.getTime() + (30 + r() * 60) * 60_000);
  const eveningBlocks = isWeekend ? 4 : 2;
  for (let i = 0; i < eveningBlocks; i++) {
    push(pick(ENTERTAINMENT, r), 10 + r() * 25);
    if (r() < 0.5) push(pick(SOCIAL, r), 4 + r() * 10);
  }
  return events;
}

// ── demo goals (static) ──────────────────────────────────────────────────────
const now = new Date();
export const DEMO_GOALS: Goal[] = [
  {
    id: "demo-goal-learn",
    userId: DEMO_USER,
    title: "Learn AI / System Design",
    description: null,
    type: "LEARN_TOPIC",
    period: "DAILY",
    direction: "AT_LEAST",
    targetCategory: null,
    keywords: ["system design", "ai", "machine learning", "tutorial"],
    targetSeconds: 2 * 3600,
    active: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "demo-goal-social",
    userId: DEMO_USER,
    title: "Limit social media",
    description: null,
    type: "LIMIT_CATEGORY",
    period: "DAILY",
    direction: "AT_MOST",
    targetCategory: "SocialMedia",
    keywords: [],
    targetSeconds: 60 * 60,
    active: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "demo-goal-deep",
    userId: DEMO_USER,
    title: "Deep work 4 hours/day",
    description: null,
    type: "DEEP_WORK",
    period: "DAILY",
    direction: "AT_LEAST",
    targetCategory: null,
    keywords: [],
    targetSeconds: 4 * 3600,
    active: true,
    createdAt: now,
    updatedAt: now,
  },
];

// ── assemble the full dataset once ───────────────────────────────────────────
interface DemoDay {
  date: Date;
  events: BrowsingEvent[];
  analytics: DailyAnalytics;
  score: ProductivityScore;
  focusSessions: FocusSession[];
  leaks: AttentionLeak[];
  insights: Insight[];
}

function build(): DemoDay[] {
  const today = startOfDay(new Date());
  const r = rng(20240614);
  const days: DemoDay[] = [];
  let prevScore: number | null = null;

  for (let d = DAYS - 1; d >= 0; d--) {
    const day = addDays(today, -d);
    const isWeekend = [0, 6].includes(day.getUTCDay());
    const raw = buildDay(day, r, isWeekend);

    let prevDomain: string | undefined;
    const events: BrowsingEvent[] = raw.map((e, i) => {
      const domain = normalizeDomain(e.site.url);
      const row: BrowsingEvent = {
        id: `demo-ev-${dayKey(day)}-${i}`,
        userId: DEMO_USER,
        url: e.site.url,
        title: e.site.title,
        domain,
        category: classify({ url: e.site.url, title: e.site.title, domain }),
        startTime: e.start,
        endTime: new Date(e.start.getTime() + e.duration * 1000),
        duration: e.duration,
        tabId: null,
        windowId: null,
        endReason: "tab_switch",
        fromDomain: prevDomain ?? null,
        createdAt: e.start,
      };
      prevDomain = domain;
      return row;
    });

    const eventLikes: EventLike[] = events.map((e) => ({
      url: e.url,
      title: e.title,
      domain: e.domain,
      category: e.category,
      startTime: e.startTime,
      endTime: e.endTime,
      duration: e.duration,
    }));

    const rollup = computeDailyRollup(eventLikes, { goals: DEMO_GOALS });
    const dk = dayKey(day);

    const analytics: DailyAnalytics = {
      id: `demo-da-${dk}`,
      userId: DEMO_USER,
      date: day,
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
      createdAt: day,
      updatedAt: day,
    } as DailyAnalytics;

    const score: ProductivityScore = {
      id: `demo-ps-${dk}`,
      userId: DEMO_USER,
      date: day,
      score: rollup.productivity.score,
      focusComponent: rollup.productivity.focusComponent,
      switchingComponent: rollup.productivity.switchingComponent,
      idleComponent: rollup.productivity.idleComponent,
      categoryComponent: rollup.productivity.categoryComponent,
      goalComponent: rollup.productivity.goalComponent,
      explanation: rollup.productivity.explanation,
      createdAt: day,
    };

    const focusSessions: FocusSession[] = rollup.focusSessions.map((f, i) => ({
      id: `demo-fs-${dk}-${i}`,
      userId: DEMO_USER,
      createdAt: day,
      ...f,
    }));
    const leaks: AttentionLeak[] = rollup.leaks.map((l, i) => ({
      id: `demo-al-${dk}-${i}`,
      userId: DEMO_USER,
      createdAt: day,
      ...l,
    }));

    const insights: Insight[] = buildAllInsights(rollup, prevScore != null ? { productivityScore: prevScore } : null).map(
      (ins, i) => ({
        id: `demo-in-${dk}-${i}`,
        userId: DEMO_USER,
        date: day,
        type: ins.type,
        source: InsightSource.DETERMINISTIC,
        severity: ins.severity,
        title: ins.title,
        body: ins.body,
        data: ins.data as object,
        createdAt: day,
      }),
    ) as Insight[];

    prevScore = rollup.productivityScore;
    days.push({ date: day, events, analytics, score, focusSessions, leaks, insights });
  }
  return days;
}

let cache: DemoDay[] | null = null;
function dataset(): DemoDay[] {
  if (!cache) cache = build();
  return cache;
}

// ── provider API (mirrors the DB-backed data.ts functions) ───────────────────
export function demoLatestDate(): Date {
  const ds = dataset();
  return ds[ds.length - 1].date;
}

export function demoOverview() {
  const ds = dataset();
  const today = ds[ds.length - 1];
  const prev = ds[ds.length - 2] ?? null;
  const goalEval = evaluateGoals(
    DEMO_GOALS,
    today.events.map((e) => ({
      url: e.url,
      title: e.title,
      domain: e.domain,
      category: e.category,
      startTime: e.startTime,
      endTime: e.endTime,
      duration: e.duration,
    })),
  );
  return {
    mode: "DEMO" as const,
    date: today.date,
    analytics: today.analytics,
    prevAnalytics: prev?.analytics ?? null,
    score: today.score,
    focusSessions: today.focusSessions,
    leaks: today.leaks,
    goals: DEMO_GOALS,
    goalProgress: goalEval.progress,
    averageGoalProgress: goalEval.averageProgress,
    summary: today.insights.find((i) => i.type === "DAILY_SUMMARY") ?? null,
  };
}

export function demoSeries(days: number): DailyAnalytics[] {
  return dataset()
    .slice(-days)
    .map((d) => d.analytics);
}

export function demoWeeklyReport(days = 7) {
  const weeklyDays: WeeklyDay[] = demoSeries(days).map((d) => ({
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

export function demoTimeline(date: Date) {
  const ds = dataset();
  const key = dayKey(startOfDay(date));
  const day = ds.find((d) => dayKey(d.date) === key) ?? ds[ds.length - 1];
  return {
    date: day.date,
    events: day.events,
    focusSessions: day.focusSessions,
    leaks: day.leaks,
  };
}

export function demoFocusSessions(days: number): FocusSession[] {
  return dataset()
    .slice(-days)
    .flatMap((d) => d.focusSessions)
    .sort((a, b) => b.duration - a.duration);
}

export function demoInsights(days: number): Insight[] {
  return dataset()
    .slice(-days)
    .flatMap((d) => d.insights)
    .sort((a, b) => b.date.getTime() - a.date.getTime() || b.severity - a.severity);
}
