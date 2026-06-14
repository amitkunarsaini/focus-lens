"use client";

import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  CalendarRange,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpRight,
  Brain,
  BookOpen,
  Unplug,
  Shuffle,
  Sparkles,
  Lightbulb,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { fmtDuration, fmtHours } from "@/lib/utils";

export interface WeeklyReportData {
  start: string;
  end: string;
  daysWithData: number;
  avgProductivity: number;
  productivityTrend: number;
  avgFocus: number;
  focusTrend: number;
  totalProductiveSeconds: number;
  totalDeepWorkSeconds: number;
  totalLearningSeconds: number;
  totalDistractingSeconds: number;
  avgContextSwitches: number;
  totalAttentionLeaks: number;
  topProductiveDomains: Array<{ domain: string; seconds: number }>;
  topDistractions: Array<{ domain: string; seconds: number }>;
  bestDay: { date: string; score: number } | null;
  spark: Array<{ date: string; productivity: number; focus: number }>;
  recommendations: string[];
  narrative: string;
}

function TrendBadge({ delta }: { delta: number }) {
  if (delta === 0)
    return (
      <Badge variant="outline">
        <Minus className="h-3 w-3" /> flat
      </Badge>
    );
  const up = delta > 0;
  return (
    <Badge variant={up ? "success" : "warning"}>
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? "+" : ""}
      {delta} pts
    </Badge>
  );
}

function DomainBars({
  rows,
  color,
}: {
  rows: Array<{ domain: string; seconds: number }>;
  color: string;
}) {
  if (rows.length === 0)
    return <p className="text-sm text-muted-foreground">None recorded.</p>;
  const max = rows[0].seconds || 1;
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.domain}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="truncate font-medium">{r.domain}</span>
            <span className="ml-2 shrink-0 tabular-nums text-muted-foreground">
              {fmtDuration(r.seconds)}
            </span>
          </div>
          <Progress value={(r.seconds / max) * 100} indicatorClassName={color} />
        </div>
      ))}
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: typeof Brain;
  label: string;
  value: string;
  tint: string;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-secondary/20 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className={`h-3.5 w-3.5 ${tint}`} />
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

export function WeeklyReportCard({ report }: { report: WeeklyReportData }) {
  const range = `${new Date(report.start).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })} – ${new Date(report.end).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })}`;

  const spark = report.spark.map((s) => ({
    label: new Date(s.date).toLocaleDateString(undefined, { weekday: "short" }),
    productivity: s.productivity,
    focus: s.focus,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card interactive className="overflow-hidden p-0">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-border/60 bg-secondary/20 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/15 ring-1 ring-cyan-400/25">
              <CalendarRange className="h-5 w-5 text-cyan-400" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold">Weekly Intelligence Report</h2>
                <Badge variant="outline">Computed</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {range} · {report.daysWithData} active day
                {report.daysWithData === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-2xl font-semibold tabular-nums">
                {report.avgProductivity}
                <span className="text-sm text-muted-foreground">/100</span>
              </div>
              <div className="text-[11px] text-muted-foreground">avg productivity</div>
            </div>
            <TrendBadge delta={report.productivityTrend} />
          </div>
        </div>

        <div className="space-y-5 p-5">
          {/* Narrative + sparkline */}
          <div className="grid gap-4 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <div className="flex items-start gap-2.5">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {report.narrative}
                </p>
              </div>
            </div>
            <div className="lg:col-span-2">
              <ResponsiveContainer width="100%" height={72}>
                <AreaChart data={spark} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="wkProd" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(258 90% 66%)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="hsl(258 90% 66%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(230 22% 9%)",
                      border: "1px solid hsl(230 16% 18%)",
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                    labelStyle={{ color: "hsl(220 12% 60%)" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="productivity"
                    stroke="hsl(258 90% 70%)"
                    strokeWidth={2}
                    fill="url(#wkProd)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Metric icon={ArrowUpRight} label="Productive" value={fmtHours(report.totalProductiveSeconds)} tint="text-emerald-400" />
            <Metric icon={Brain} label="Deep work" value={fmtHours(report.totalDeepWorkSeconds)} tint="text-primary" />
            <Metric icon={BookOpen} label="Learning" value={fmtHours(report.totalLearningSeconds)} tint="text-cyan-400" />
            <Metric icon={Unplug} label="Distractions" value={fmtHours(report.totalDistractingSeconds)} tint="text-rose-400" />
            <Metric icon={Shuffle} label="Switches/day" value={String(report.avgContextSwitches)} tint="text-amber-400" />
            <Metric icon={Unplug} label="Leaks" value={String(report.totalAttentionLeaks)} tint="text-rose-400" />
          </div>

          {/* Top sites */}
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Top productive sites
              </h3>
              <DomainBars rows={report.topProductiveDomains} color="bg-emerald-400" />
            </div>
            <div>
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Top distractions
              </h3>
              <DomainBars rows={report.topDistractions} color="bg-rose-400" />
            </div>
          </div>

          {/* Recommendations */}
          <div>
            <h3 className="mb-3 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
              Recommendations
            </h3>
            <div className="space-y-2">
              {report.recommendations.map((rec, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 rounded-xl border border-border/50 bg-secondary/20 p-3 text-sm"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                    {i + 1}
                  </span>
                  <span className="text-muted-foreground">{rec}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
