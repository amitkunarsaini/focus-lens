import { Category } from "@prisma/client";
import { CATEGORY_PRODUCTIVITY } from "@/lib/classify";
import type { EventLike, FocusSessionResult } from "./types";

/**
 * Focus-session detection.
 *
 * A focus session is a run of mostly-productive activity that is not broken by
 * a long gap or a sustained distracting detour. GitHub → Docs → StackOverflow
 * for 90 minutes is one session; a 6-minute WhatsApp detour inside it is an
 * interruption, not a session boundary.
 */

export const FOCUS_CONFIG = {
  /** A session must run at least this long to count. */
  minSessionSeconds: 15 * 60,
  /** Gaps longer than this (no events) split sessions. */
  maxGapSeconds: 10 * 60,
  /** A distracting detour longer than this ends the session. */
  maxDistractionSeconds: 5 * 60,
  /** Sessions at/above this are "deep work". */
  deepWorkSeconds: 45 * 60,
} as const;

function isProductive(c: Category) {
  return CATEGORY_PRODUCTIVITY[c] === "Productive";
}

interface Accumulator {
  events: EventLike[];
  start: Date;
  end: Date;
  productiveSeconds: number;
  totalSeconds: number;
  interruptions: number;
  pendingDistractionSeconds: number;
}

function finalize(acc: Accumulator): FocusSessionResult | null {
  const duration = acc.productiveSeconds + acc.pendingDistractionSeconds;
  if (acc.productiveSeconds < FOCUS_CONFIG.minSessionSeconds) return null;

  const byCat = new Map<Category, number>();
  const byDomain = new Map<string, number>();
  const orderedDomains: string[] = [];
  for (const e of acc.events) {
    if (!isProductive(e.category)) continue;
    byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.duration);
    byDomain.set(e.domain, (byDomain.get(e.domain) ?? 0) + e.duration);
    if (!orderedDomains.includes(e.domain)) orderedDomains.push(e.domain);
  }

  const primaryCategory =
    [...byCat.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
    Category.Uncategorized;
  const primaryDomain =
    [...byDomain.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "unknown";

  // Score: productive density minus interruption penalty.
  const density = acc.productiveSeconds / Math.max(duration, 1);
  const interruptionPenalty = Math.min(acc.interruptions * 6, 40);
  const productivityScore = Math.max(
    0,
    Math.min(100, Math.round(density * 100 - interruptionPenalty)),
  );

  return {
    startTime: acc.events[0].startTime,
    endTime: acc.events[acc.events.length - 1].endTime,
    duration,
    primaryCategory,
    primaryDomain,
    productivityScore,
    interruptions: acc.interruptions,
    eventCount: acc.events.filter((e) => isProductive(e.category)).length,
    domains: orderedDomains,
  };
}

export function detectFocusSessions(events: EventLike[]): FocusSessionResult[] {
  const sorted = [...events].sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime(),
  );
  const sessions: FocusSessionResult[] = [];
  let acc: Accumulator | null = null;

  const flush = () => {
    if (acc) {
      const s = finalize(acc);
      if (s) sessions.push(s);
      acc = null;
    }
  };

  for (const e of sorted) {
    const productive = isProductive(e.category);

    if (!acc) {
      if (productive) {
        acc = {
          events: [e],
          start: e.startTime,
          end: e.endTime,
          productiveSeconds: e.duration,
          totalSeconds: e.duration,
          interruptions: 0,
          pendingDistractionSeconds: 0,
        };
      }
      continue;
    }

    const gap = (e.startTime.getTime() - acc.end.getTime()) / 1000;
    if (gap > FOCUS_CONFIG.maxGapSeconds) {
      flush();
      if (productive) {
        acc = {
          events: [e],
          start: e.startTime,
          end: e.endTime,
          productiveSeconds: e.duration,
          totalSeconds: e.duration,
          interruptions: 0,
          pendingDistractionSeconds: 0,
        };
      }
      continue;
    }

    if (productive) {
      acc.events.push(e);
      acc.productiveSeconds += e.duration;
      acc.totalSeconds += e.duration + acc.pendingDistractionSeconds;
      acc.end = e.endTime;
      acc.pendingDistractionSeconds = 0;
    } else {
      // A distracting detour. Tolerate short ones as interruptions.
      if (e.duration > FOCUS_CONFIG.maxDistractionSeconds) {
        flush();
      } else {
        acc.interruptions += 1;
        acc.pendingDistractionSeconds += e.duration;
        acc.events.push(e);
        acc.end = e.endTime;
      }
    }
  }
  flush();
  return sessions;
}

export function isDeepWork(session: { duration: number }): boolean {
  return session.duration >= FOCUS_CONFIG.deepWorkSeconds;
}
