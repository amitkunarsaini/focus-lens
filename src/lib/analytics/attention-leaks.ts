import { Category } from "@prisma/client";
import { CATEGORY_PRODUCTIVITY } from "@/lib/classify";
import type { EventLike, AttentionLeakResult } from "./types";

/**
 * Attention-leak detection.
 *
 * A leak is a productive run that gets repeatedly broken by distracting
 * detours and then returns to the work — the classic GitHub → WhatsApp →
 * LinkedIn → GitHub pattern. We surface the interruption count, the time spent
 * away, and an estimated refocus cost.
 *
 * The refocus heuristic uses the widely-cited ~23 minutes-to-refocus figure,
 * scaled down per micro-interruption to a conservative per-switch cost.
 */

export const LEAK_CONFIG = {
  /** Productive context must run at least this long to be "in flow". */
  minContextSeconds: 10 * 60,
  /** Need at least this many detours to call it a leak. */
  minInterruptions: 2,
  /** Estimated seconds lost re-acquiring focus per interruption. */
  recoveryCostPerSwitch: 23 * 60 * 0.18, // ~4.1 min, conservative
  /** A detour longer than this is a context change, not a leak. */
  maxDetourSeconds: 8 * 60,
} as const;

function isProductive(c: Category) {
  return CATEGORY_PRODUCTIVITY[c] === "Productive";
}
function isDistracting(c: Category) {
  return CATEGORY_PRODUCTIVITY[c] === "Distracting";
}

interface Run {
  events: EventLike[];
  productiveSeconds: number;
  lostSeconds: number;
  interruptions: number;
  triggers: Map<string, number>;
  primaryDomainSeconds: Map<string, number>;
  primaryCategorySeconds: Map<Category, number>;
}

function newRun(): Run {
  return {
    events: [],
    productiveSeconds: 0,
    lostSeconds: 0,
    interruptions: 0,
    triggers: new Map(),
    primaryDomainSeconds: new Map(),
    primaryCategorySeconds: new Map(),
  };
}

function finalize(run: Run): AttentionLeakResult | null {
  if (
    run.interruptions < LEAK_CONFIG.minInterruptions ||
    run.productiveSeconds < LEAK_CONFIG.minContextSeconds
  )
    return null;

  const primaryDomain =
    [...run.primaryDomainSeconds.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
    "unknown";
  const primaryCategory =
    [...run.primaryCategorySeconds.entries()].sort(
      (a, b) => b[1] - a[1],
    )[0]?.[0] ?? Category.Uncategorized;
  const triggers = [...run.triggers.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([d]) => d);

  return {
    startTime: run.events[0].startTime,
    endTime: run.events[run.events.length - 1].endTime,
    primaryCategory,
    primaryDomain,
    interruptions: run.interruptions,
    lostSeconds: run.lostSeconds,
    recoverySeconds: Math.round(
      run.interruptions * LEAK_CONFIG.recoveryCostPerSwitch,
    ),
    triggers,
  };
}

export function detectAttentionLeaks(
  events: EventLike[],
): AttentionLeakResult[] {
  const sorted = [...events].sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime(),
  );
  const leaks: AttentionLeakResult[] = [];
  let run: Run | null = null;

  const flush = () => {
    if (run) {
      const leak = finalize(run);
      if (leak) leaks.push(leak);
      run = null;
    }
  };

  for (const e of sorted) {
    if (isProductive(e.category)) {
      if (!run) run = newRun();
      run.events.push(e);
      run.productiveSeconds += e.duration;
      run.primaryDomainSeconds.set(
        e.domain,
        (run.primaryDomainSeconds.get(e.domain) ?? 0) + e.duration,
      );
      run.primaryCategorySeconds.set(
        e.category,
        (run.primaryCategorySeconds.get(e.category) ?? 0) + e.duration,
      );
    } else if (run && isDistracting(e.category)) {
      if (e.duration > LEAK_CONFIG.maxDetourSeconds) {
        // Long detour: the user genuinely switched contexts.
        flush();
      } else {
        run.interruptions += 1;
        run.lostSeconds += e.duration;
        run.triggers.set(e.domain, (run.triggers.get(e.domain) ?? 0) + 1);
        run.events.push(e);
      }
    }
    // Neutral activity neither sustains nor breaks the leak window.
  }
  flush();
  return leaks;
}
