import {
  Lightbulb,
  Sparkles,
  Unplug,
  TrendingUp,
  AlertTriangle,
  Target as TargetIcon,
  CalendarRange,
} from "lucide-react";
import { InsightType } from "@prisma/client";
import { getCurrentUserId } from "@/lib/auth";
import { getInsights, getWeeklyReport } from "@/lib/data";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SeedDemoButton } from "@/components/dashboard/seed-demo-button";
import { WeeklyReportCard } from "@/components/dashboard/weekly-report";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TYPE_META: Record<
  InsightType,
  { icon: typeof Lightbulb; tint: string; label: string }
> = {
  DAILY_SUMMARY: { icon: Sparkles, tint: "text-primary bg-primary/15 ring-primary/25", label: "Daily summary" },
  WEEKLY_REPORT: { icon: CalendarRange, tint: "text-cyan-400 bg-cyan-400/15 ring-cyan-400/25", label: "Weekly report" },
  PATTERN: { icon: TrendingUp, tint: "text-emerald-400 bg-emerald-400/15 ring-emerald-400/25", label: "Pattern" },
  ATTENTION_LEAK: { icon: Unplug, tint: "text-rose-400 bg-rose-400/15 ring-rose-400/25", label: "Attention leak" },
  RECOMMENDATION: { icon: TargetIcon, tint: "text-violet-400 bg-violet-400/15 ring-violet-400/25", label: "Recommendation" },
  RISK: { icon: AlertTriangle, tint: "text-amber-400 bg-amber-400/15 ring-amber-400/25", label: "Risk" },
};

export default async function InsightsPage() {
  const userId = (await getCurrentUserId())!;
  const [insights, weekly] = await Promise.all([
    getInsights(userId, 14),
    getWeeklyReport(userId, 7),
  ]);

  if (insights.length === 0) {
    return (
      <>
        <PageHeader title="Insights" subtitle="What FocusLens noticed about your attention." />
        <EmptyState
          icon={Lightbulb}
          title="No insights yet"
          description="As FocusLens analyzes your behaviour, it surfaces patterns, risks, attention leaks and recommendations here."
          action={<SeedDemoButton />}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Insights"
        subtitle="Behavioural patterns, risks and recommendations from your real data."
      />

      {weekly && (
        <div className="mb-6">
          <WeeklyReportCard
            report={{
              ...weekly,
              start: weekly.start.toISOString(),
              end: weekly.end.toISOString(),
              bestDay: weekly.bestDay
                ? { date: weekly.bestDay.date.toISOString(), score: weekly.bestDay.score }
                : null,
            }}
          />
        </div>
      )}

      <h2 className="mb-3 text-sm font-medium text-muted-foreground">Recent insights</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {insights.map((ins) => {
          const meta = TYPE_META[ins.type];
          const Icon = meta.icon;
          return (
            <Card key={ins.id} interactive className="p-5">
              <div className="flex items-start gap-3">
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1", meta.tint)}>
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold">{ins.title}</h3>
                    <Badge variant="outline">{meta.label}</Badge>
                    {ins.source === "AI" && <Badge variant="default">AI</Badge>}
                    {ins.severity === 2 && <Badge variant="danger">Action needed</Badge>}
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{ins.body}</p>
                  <p className="mt-2 text-[11px] text-muted-foreground/60">
                    {new Date(ins.date).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
