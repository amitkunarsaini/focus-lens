import { Category, Goal, GoalDirection, GoalType } from "@prisma/client";
import type { EventLike } from "./types";
import { clamp } from "@/lib/utils";

/**
 * Goal-alignment engine.
 *
 * Compares declared goals against measured behaviour and produces a progress
 * ratio and a per-goal alignment score. Works for "spend N hours learning AI"
 * (AT_LEAST) and "stay under 1h of social media" (AT_MOST) alike.
 */

export interface GoalProgress {
  goalId: string;
  title: string;
  type: GoalType;
  direction: GoalDirection;
  actualSeconds: number;
  targetSeconds: number;
  /** 0..1 — for AT_LEAST, actual/target; for AT_MOST, headroom remaining. */
  progress: number;
  /** 0..100 alignment score. */
  alignment: number;
  onTrack: boolean;
}

function matchesGoal(goal: Goal, e: EventLike): boolean {
  switch (goal.type) {
    case GoalType.DEEP_WORK:
      // Counted from focus sessions elsewhere; here approximate by productive dev/work.
      return (
        e.category === Category.Development ||
        e.category === Category.Work ||
        e.category === Category.Documentation
      );
    case GoalType.CATEGORY_TIME:
    case GoalType.LIMIT_CATEGORY:
      return goal.targetCategory != null && e.category === goal.targetCategory;
    case GoalType.LEARN_TOPIC: {
      if (goal.keywords.length === 0) return e.category === Category.Learning;
      const hay = `${e.title} ${e.domain} ${e.url}`.toLowerCase();
      return goal.keywords.some((k) => hay.includes(k.toLowerCase()));
    }
    default:
      return false;
  }
}

export function evaluateGoal(goal: Goal, events: EventLike[]): GoalProgress {
  const actualSeconds = events.reduce(
    (sum, e) => (matchesGoal(goal, e) ? sum + e.duration : sum),
    0,
  );
  const target = Math.max(goal.targetSeconds, 1);

  let progress: number;
  let onTrack: boolean;
  if (goal.direction === GoalDirection.AT_LEAST) {
    progress = clamp(actualSeconds / target, 0, 1);
    onTrack = actualSeconds >= target;
  } else {
    // AT_MOST — full credit while under budget, decaying as it's exceeded.
    progress = clamp(1 - Math.max(0, actualSeconds - target) / target, 0, 1);
    onTrack = actualSeconds <= target;
  }

  return {
    goalId: goal.id,
    title: goal.title,
    type: goal.type,
    direction: goal.direction,
    actualSeconds,
    targetSeconds: goal.targetSeconds,
    progress,
    alignment: Math.round(progress * 100),
    onTrack,
  };
}

export function evaluateGoals(
  goals: Goal[],
  events: EventLike[],
): { progress: GoalProgress[]; averageProgress: number } {
  const progress = goals.map((g) => evaluateGoal(g, events));
  const averageProgress =
    progress.length > 0
      ? progress.reduce((s, p) => s + p.progress, 0) / progress.length
      : 0;
  return { progress, averageProgress };
}
