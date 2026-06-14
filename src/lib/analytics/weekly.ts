import { Category } from "@prisma/client";
import { CATEGORY_PRODUCTIVITY, normalizeDomain, classify } from "@/lib/classify";
import { fmtDuration } from "@/lib/utils";

/**
 * Weekly Intelligence Report engine.
 *
 * Aggregates a window of daily rollups into a structured weekly narrative:
 * productivity & focus trends, top productive sites, top distractions, learning
 * and deep-work hours, and actionable recommendations. Fully deterministic —
 * derived from the same DailyAnalytics rows the dashboard already stores.
 */

export interface WeeklyDay {
  date: Date;
  productivityScore: number;
  focusScore: number;
  deepWorkSeconds: number;
  focusSeconds: number;
  productiveSeconds: number;
  distractingSeconds: number;
  contextSwitches: number;
  attentionLeaks: number;
  categoryBreakdown: Record<string, number>;
  domainBreakdown: Record<string, number>;
}

export interface DomainTotal {
  domain: string;
  seconds: number;
}

export interface WeeklyReport {
  start: Date;
  end: Date;
  daysWithData: number;
  avgProductivity: number;
  /** avg(second half) − avg(first half) of the window, in score points. */
  productivityTrend: number;
  avgFocus: number;
  focusTrend: number;
  totalProductiveSeconds: number;
  totalDeepWorkSeconds: number;
  totalLearningSeconds: number;
  totalDistractingSeconds: number;
  avgContextSwitches: number;
  totalAttentionLeaks: number;
  topProductiveDomains: DomainTotal[];
  topDistractions: DomainTotal[];
  bestDay: { date: Date; score: number } | null;
  /** Per-day productivity scores for a sparkline. */
  spark: Array<{ date: string; productivity: number; focus: number }>;
  recommendations: string[];
  narrative: string;
}

function mean(ns: number[]): number {
  return ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : 0;
}

function trend(values: number[]): number {
  if (values.length < 2) return 0;
  const mid = Math.ceil(values.length / 2);
  return Math.round(mean(values.slice(mid)) - mean(values.slice(0, mid)));
}

export function computeWeeklyReport(days: WeeklyDay[]): WeeklyReport | null {
  const withData = days.filter((d) => d.productiveSeconds + d.distractingSeconds > 0);
  if (withData.length === 0) return null;

  const sorted = [...days].sort((a, b) => a.date.getTime() - b.date.getTime());

  const prodScores = sorted.map((d) => d.productivityScore);
  const focusScores = sorted.map((d) => d.focusScore);

  // Aggregate domain seconds across the window, then bucket by classification.
  const domainSeconds: Record<string, number> = {};
  let totalLearning = 0;
  for (const d of sorted) {
    for (const [domain, secs] of Object.entries(d.domainBreakdown ?? {})) {
      const host = normalizeDomain(domain);
      domainSeconds[host] = (domainSeconds[host] ?? 0) + secs;
    }
    totalLearning +=
      (d.categoryBreakdown?.[Category.Learning] ?? 0) +
      (d.categoryBreakdown?.[Category.Documentation] ?? 0);
  }

  const productive: DomainTotal[] = [];
  const distracting: DomainTotal[] = [];
  for (const [domain, seconds] of Object.entries(domainSeconds)) {
    const bucket = CATEGORY_PRODUCTIVITY[classify({ url: `https://${domain}`, domain })];
    if (bucket === "Productive") productive.push({ domain, seconds });
    else if (bucket === "Distracting") distracting.push({ domain, seconds });
  }
  productive.sort((a, b) => b.seconds - a.seconds);
  distracting.sort((a, b) => b.seconds - a.seconds);

  const bestDayRow = [...withData].sort(
    (a, b) => b.productivityScore - a.productivityScore,
  )[0];

  const totalProductive = sorted.reduce((s, d) => s + d.productiveSeconds, 0);
  const totalDeepWork = sorted.reduce((s, d) => s + d.deepWorkSeconds, 0);
  const totalDistracting = sorted.reduce((s, d) => s + d.distractingSeconds, 0);
  const totalLeaks = sorted.reduce((s, d) => s + d.attentionLeaks, 0);
  const avgSwitches = Math.round(mean(withData.map((d) => d.contextSwitches)));

  const report: WeeklyReport = {
    start: sorted[0].date,
    end: sorted[sorted.length - 1].date,
    daysWithData: withData.length,
    avgProductivity: Math.round(mean(withData.map((d) => d.productivityScore))),
    productivityTrend: trend(prodScores),
    avgFocus: Math.round(mean(withData.map((d) => d.focusScore))),
    focusTrend: trend(focusScores),
    totalProductiveSeconds: totalProductive,
    totalDeepWorkSeconds: totalDeepWork,
    totalLearningSeconds: totalLearning,
    totalDistractingSeconds: totalDistracting,
    avgContextSwitches: avgSwitches,
    totalAttentionLeaks: totalLeaks,
    topProductiveDomains: productive.slice(0, 5),
    topDistractions: distracting.slice(0, 5),
    bestDay: bestDayRow
      ? { date: bestDayRow.date, score: bestDayRow.productivityScore }
      : null,
    spark: sorted.map((d) => ({
      date: d.date.toISOString(),
      productivity: d.productivityScore,
      focus: d.focusScore,
    })),
    recommendations: [],
    narrative: "",
  };

  report.recommendations = buildRecommendations(report);
  report.narrative = buildNarrative(report);
  return report;
}

function buildRecommendations(r: WeeklyReport): string[] {
  const recs: string[] = [];

  if (r.totalDistractingSeconds > r.totalProductiveSeconds * 0.4 && r.topDistractions[0]) {
    recs.push(
      `Cap time on ${r.topDistractions[0].domain} — it took ${fmtDuration(
        r.topDistractions[0].seconds,
      )} this week. Try a site limit during focus blocks.`,
    );
  }
  if (r.totalDeepWorkSeconds < r.daysWithData * 2 * 3600) {
    recs.push(
      `Deep work averaged ${fmtDuration(
        Math.round(r.totalDeepWorkSeconds / r.daysWithData),
      )}/day. Block a protected 90-minute window each morning to push this up.`,
    );
  }
  if (r.avgContextSwitches > 15) {
    recs.push(
      `You averaged ${r.avgContextSwitches} context switches/day. Batch similar tasks and mute chat during focus to cut fragmentation.`,
    );
  }
  if (r.totalLearningSeconds < r.daysWithData * 30 * 60) {
    recs.push(
      `Only ${fmtDuration(r.totalLearningSeconds)} went to learning this week. A daily 30-minute learning slot compounds fast.`,
    );
  }
  if (r.productivityTrend < 0) {
    recs.push(
      `Productivity trended down ${Math.abs(
        r.productivityTrend,
      )} points across the week — review what changed mid-week and protect your best routine.`,
    );
  }
  if (recs.length === 0) {
    recs.push("Strong, balanced week — keep the routine that's working and aim to extend your longest focus block.");
  }
  return recs.slice(0, 3);
}

function buildNarrative(r: WeeklyReport): string {
  const dir =
    r.productivityTrend > 0 ? "up" : r.productivityTrend < 0 ? "down" : "flat";
  const parts: string[] = [];
  parts.push(
    `Across ${r.daysWithData} active day${r.daysWithData === 1 ? "" : "s"} you logged ${fmtDuration(
      r.totalProductiveSeconds,
    )} of productive time and ${fmtDuration(r.totalDeepWorkSeconds)} of deep work.`,
  );
  parts.push(
    `Average productivity was ${r.avgProductivity}/100, trending ${dir}${
      dir === "flat" ? "" : ` by ${Math.abs(r.productivityTrend)} points`
    }.`,
  );
  if (r.bestDay) {
    parts.push(
      `Your strongest day was ${r.bestDay.date.toLocaleDateString(undefined, {
        weekday: "long",
      })} (${r.bestDay.score}/100).`,
    );
  }
  if (r.topDistractions[0]) {
    parts.push(`Top distraction: ${r.topDistractions[0].domain}.`);
  }
  return parts.join(" ");
}
