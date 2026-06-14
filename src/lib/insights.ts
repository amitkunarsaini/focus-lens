import { Category, InsightType } from "@prisma/client";
import { CATEGORY_META } from "@/lib/classify";
import { fmtDuration, fmtTime } from "@/lib/utils";
import type { DailyRollup } from "@/lib/analytics/rollup";

/**
 * Deterministic insight generation.
 *
 * Turns a {@link DailyRollup} into structured insights with human narratives.
 * Every sentence is derived from measured numbers; the AI layer (ai.ts) may
 * later rephrase the narrative but never invents data.
 */

export interface GeneratedInsight {
  type: InsightType;
  severity: number;
  title: string;
  body: string;
  data: Record<string, unknown>;
}

function topDistraction(rollup: DailyRollup): { domain: string; seconds: number } | null {
  const distractingDomains = Object.entries(rollup.domainBreakdown).filter(
    ([, secs]) => secs > 0,
  );
  // domainBreakdown isn't category-tagged; approximate via the leaks' triggers.
  const trigger = rollup.leaks.flatMap((l) => l.triggers)[0];
  if (trigger) {
    const secs = rollup.domainBreakdown[trigger] ?? 0;
    return { domain: trigger, seconds: secs };
  }
  return distractingDomains.length
    ? { domain: distractingDomains[0][0], seconds: distractingDomains[0][1] }
    : null;
}

/** The headline daily narrative. */
export function buildDailySummary(
  rollup: DailyRollup,
  prev?: { productivityScore: number } | null,
): GeneratedInsight {
  const sentences: string[] = [];
  sentences.push(
    `Today you spent ${fmtDuration(rollup.totalSeconds)} online, of which ${fmtDuration(
      rollup.productiveSeconds,
    )} was productive.`,
  );

  if (rollup.peakFocusStart && rollup.peakFocusEnd) {
    sentences.push(
      `Your highest focus period was between ${fmtTime(
        rollup.peakFocusStart,
      )} and ${fmtTime(rollup.peakFocusEnd)}.`,
    );
  }

  const distraction = topDistraction(rollup);
  if (distraction && rollup.distractingSeconds > 0) {
    sentences.push(
      `Most distractions came from ${distraction.domain}.`,
    );
  }

  if (prev) {
    const delta = rollup.productivityScore - prev.productivityScore;
    if (delta !== 0) {
      const dir = delta > 0 ? "increased" : "decreased";
      sentences.push(
        `Compared to the previous day, your productivity score ${dir} by ${Math.abs(
          delta,
        )} points.`,
      );
    }
  }

  return {
    type: InsightType.DAILY_SUMMARY,
    severity: 0,
    title: `Daily summary — productivity ${rollup.productivityScore}/100`,
    body: sentences.join(" "),
    data: {
      productivityScore: rollup.productivityScore,
      totalSeconds: rollup.totalSeconds,
      productiveSeconds: rollup.productiveSeconds,
      deepWorkSeconds: rollup.deepWorkSeconds,
      previousScore: prev?.productivityScore ?? null,
    },
  };
}

/** Attention-leak insights, one per significant leak. */
export function buildLeakInsights(rollup: DailyRollup): GeneratedInsight[] {
  return rollup.leaks
    .filter((l) => l.interruptions >= 2)
    .slice(0, 3)
    .map((leak) => {
      const meta = CATEGORY_META[leak.primaryCategory];
      return {
        type: InsightType.ATTENTION_LEAK,
        severity: leak.interruptions >= 4 ? 2 : 1,
        title: `${meta.label} focus broken ${leak.interruptions}×`,
        body:
          `Your ${meta.label.toLowerCase()} session on ${leak.primaryDomain} was ` +
          `interrupted ${leak.interruptions} times` +
          (leak.triggers.length ? ` (mainly ${leak.triggers.slice(0, 2).join(", ")})` : "") +
          `. Estimated focus-recovery loss: ${fmtDuration(leak.recoverySeconds)}.`,
        data: {
          interruptions: leak.interruptions,
          lostSeconds: leak.lostSeconds,
          recoverySeconds: leak.recoverySeconds,
          triggers: leak.triggers,
        },
      };
    });
}

/** Behavioural patterns + recommendations. */
export function buildPatternInsights(rollup: DailyRollup): GeneratedInsight[] {
  const out: GeneratedInsight[] = [];

  // Peak productivity window pattern.
  const bestHour = [...rollup.hourlyBreakdown].sort(
    (a, b) => b.productive - a.productive,
  )[0];
  if (bestHour && bestHour.productive > 15 * 60) {
    out.push({
      type: InsightType.PATTERN,
      severity: 0,
      title: "You're sharpest in a clear window",
      body: `Your most productive hour is around ${formatHour(
        bestHour.hour,
      )}, with ${fmtDuration(bestHour.productive)} of focused work. Protect it from meetings and notifications.`,
      data: { hour: bestHour.hour, productiveSeconds: bestHour.productive },
    });
  }

  // High context switching risk.
  if (rollup.contextSwitchScore < 50 && rollup.totalSeconds > 30 * 60) {
    out.push({
      type: InsightType.RISK,
      severity: 2,
      title: "High context switching detected",
      body: `You switched between sites ${rollup.contextSwitches} times today. Frequent switching fragments attention — try batching similar tasks and silencing chat for focus blocks.`,
      data: { contextSwitches: rollup.contextSwitches, score: rollup.contextSwitchScore },
    });
  }

  // Learning vs consuming balance.
  const learning =
    (rollup.categoryBreakdown[Category.Learning] ?? 0) +
    (rollup.categoryBreakdown[Category.Documentation] ?? 0);
  const entertainment =
    (rollup.categoryBreakdown[Category.Entertainment] ?? 0) +
    (rollup.categoryBreakdown[Category.SocialMedia] ?? 0);
  if (learning > 0 || entertainment > 0) {
    out.push({
      type: InsightType.RECOMMENDATION,
      severity: entertainment > learning * 2 ? 1 : 0,
      title: "Learning vs. consuming",
      body:
        `You spent ${fmtDuration(learning)} learning and ${fmtDuration(
          entertainment,
        )} on entertainment & social. ` +
        (entertainment > learning
          ? "Consider flipping that ratio tomorrow — even a 15-minute swap compounds."
          : "Nice balance — your inputs skew toward growth."),
      data: { learningSeconds: learning, entertainmentSeconds: entertainment },
    });
  }

  return out;
}

export function buildAllInsights(
  rollup: DailyRollup,
  prev?: { productivityScore: number } | null,
): GeneratedInsight[] {
  return [
    buildDailySummary(rollup, prev),
    ...buildLeakInsights(rollup),
    ...buildPatternInsights(rollup),
  ];
}

function formatHour(h: number): string {
  const ampm = h < 12 ? "AM" : "PM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:00 ${ampm}`;
}

// The Weekly Intelligence Report lives in analytics/weekly.ts (computeWeeklyReport).
