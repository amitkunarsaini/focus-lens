import { Category, Goal, Productivity } from "@prisma/client";
import { CATEGORY_PRODUCTIVITY } from "@/lib/classify";
import { detectFocusSessions, isDeepWork } from "./focus-sessions";
import { detectAttentionLeaks } from "./attention-leaks";
import { analyzeContextSwitching } from "./context-switching";
import { computeProductivity } from "./productivity";
import { evaluateGoals } from "./goals";
import type {
  EventLike,
  FocusSessionResult,
  AttentionLeakResult,
} from "./types";

export interface HourBucket {
  hour: number;
  productive: number;
  neutral: number;
  distracting: number;
}

export interface DailyRollup {
  totalSeconds: number;
  productiveSeconds: number;
  neutralSeconds: number;
  distractingSeconds: number;
  idleSeconds: number;
  focusSeconds: number;
  deepWorkSeconds: number;
  contextSwitches: number;
  attentionLeaks: number;
  productivityScore: number;
  focusScore: number;
  contextSwitchScore: number;
  topCategory: Category;
  peakFocusStart: Date | null;
  peakFocusEnd: Date | null;
  categoryBreakdown: Record<string, number>;
  domainBreakdown: Record<string, number>;
  hourlyBreakdown: HourBucket[];
  focusSessions: FocusSessionResult[];
  leaks: AttentionLeakResult[];
  productivity: ReturnType<typeof computeProductivity>;
  goalProgress: ReturnType<typeof evaluateGoals>;
}

export function computeDailyRollup(
  events: EventLike[],
  options: { goals?: Goal[]; idleSeconds?: number } = {},
): DailyRollup {
  const goals = options.goals ?? [];
  const idleSeconds = options.idleSeconds ?? 0;

  const categoryBreakdown: Record<string, number> = {};
  const domainBreakdown: Record<string, number> = {};
  const byProductivity: Record<Productivity, number> = {
    Productive: 0,
    Neutral: 0,
    Distracting: 0,
  };
  const hourly: HourBucket[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    productive: 0,
    neutral: 0,
    distracting: 0,
  }));

  let totalSeconds = 0;
  for (const e of events) {
    totalSeconds += e.duration;
    categoryBreakdown[e.category] =
      (categoryBreakdown[e.category] ?? 0) + e.duration;
    domainBreakdown[e.domain] = (domainBreakdown[e.domain] ?? 0) + e.duration;
    const bucket = CATEGORY_PRODUCTIVITY[e.category];
    byProductivity[bucket] += e.duration;
    const h = e.startTime.getHours();
    if (bucket === Productivity.Productive) hourly[h].productive += e.duration;
    else if (bucket === Productivity.Distracting)
      hourly[h].distracting += e.duration;
    else hourly[h].neutral += e.duration;
  }

  const focusSessions = detectFocusSessions(events);
  const leaks = detectAttentionLeaks(events);
  const contextSwitch = analyzeContextSwitching(events);

  const focusSeconds = focusSessions.reduce((s, f) => s + f.duration, 0);
  const deepWorkSeconds = focusSessions
    .filter(isDeepWork)
    .reduce((s, f) => s + f.duration, 0);

  // Peak focus = longest focus session.
  const longest = [...focusSessions].sort((a, b) => b.duration - a.duration)[0];

  const topCategory =
    (Object.entries(categoryBreakdown).sort(
      (a, b) => b[1] - a[1],
    )[0]?.[0] as Category) ?? Category.Uncategorized;

  const goalProgress = evaluateGoals(goals, events);

  const productivity = computeProductivity({
    productiveSeconds: byProductivity.Productive,
    neutralSeconds: byProductivity.Neutral,
    distractingSeconds: byProductivity.Distracting,
    idleSeconds,
    deepWorkSeconds,
    focusSeconds,
    contextSwitch,
    goalProgress: goals.length > 0 ? goalProgress.averageProgress : undefined,
  });

  // Focus score: blended focus-time saturation + session quality.
  const focusTimeRatio = Math.min(1, focusSeconds / (4 * 3600));
  const avgSessionQuality =
    focusSessions.length > 0
      ? focusSessions.reduce((s, f) => s + f.productivityScore, 0) /
        focusSessions.length /
        100
      : 0;
  const focusScore = Math.round((focusTimeRatio * 0.6 + avgSessionQuality * 0.4) * 100);

  return {
    totalSeconds,
    productiveSeconds: byProductivity.Productive,
    neutralSeconds: byProductivity.Neutral,
    distractingSeconds: byProductivity.Distracting,
    idleSeconds,
    focusSeconds,
    deepWorkSeconds,
    contextSwitches: contextSwitch.domainSwitches,
    attentionLeaks: leaks.length,
    productivityScore: productivity.score,
    focusScore,
    contextSwitchScore: contextSwitch.score,
    topCategory,
    peakFocusStart: longest?.startTime ?? null,
    peakFocusEnd: longest?.endTime ?? null,
    categoryBreakdown,
    domainBreakdown: topN(domainBreakdown, 15),
    hourlyBreakdown: hourly,
    focusSessions,
    leaks,
    productivity,
    goalProgress,
  };
}

function topN(rec: Record<string, number>, n: number): Record<string, number> {
  return Object.fromEntries(
    Object.entries(rec)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n),
  );
}
