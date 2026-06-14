import { CATEGORY_PRODUCTIVITY } from "@/lib/classify";
import type { EventLike, ContextSwitchResult } from "./types";

/**
 * Context-switching analysis.
 *
 * Counts how often attention jumps between domains and, more importantly, how
 * often it jumps from productive work into a distraction. The score rewards
 * sustained attention: few switches per active hour → high score.
 */

export function analyzeContextSwitching(
  events: EventLike[],
): ContextSwitchResult {
  const sorted = [...events].sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime(),
  );

  let totalSwitches = 0;
  let domainSwitches = 0;
  let productiveToDistracting = 0;
  let activeSeconds = 0;

  for (let i = 0; i < sorted.length; i++) {
    activeSeconds += sorted[i].duration;
    if (i === 0) continue;
    const prev = sorted[i - 1];
    const cur = sorted[i];
    totalSwitches += 1;
    if (prev.domain !== cur.domain) domainSwitches += 1;
    if (
      CATEGORY_PRODUCTIVITY[prev.category] === "Productive" &&
      CATEGORY_PRODUCTIVITY[cur.category] === "Distracting"
    ) {
      productiveToDistracting += 1;
    }
  }

  const activeHours = Math.max(activeSeconds / 3600, 0.1);
  const switchesPerActiveHour = domainSwitches / activeHours;

  // A focused hour has well under ~12 domain switches. Map that to a 0–100
  // score where ≤6/hr ≈ 100 and ≥40/hr ≈ 0.
  const score = Math.max(
    0,
    Math.min(100, Math.round(100 - (switchesPerActiveHour - 6) * 3)),
  );

  return {
    totalSwitches,
    domainSwitches,
    productiveToDistracting,
    score,
    switchesPerActiveHour: Math.round(switchesPerActiveHour * 10) / 10,
  };
}
