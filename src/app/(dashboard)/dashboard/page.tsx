import { Sparkles, TrendingUp, Clock3 } from "lucide-react";
import { getCurrentUserId } from "@/lib/auth";
import { getOverview, getSeries } from "@/lib/data";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { ScoreRing } from "@/components/dashboard/score-ring";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ProductivityTrend, CategoryDonut } from "@/components/charts/charts";
import { CATEGORY_META } from "@/lib/classify";
import { fmtDuration, fmtTime, fmtHours } from "@/lib/utils";
import { SeedDemoButton } from "@/components/dashboard/seed-demo-button";
import { ConnectExtension } from "@/components/dashboard/connect-extension";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const userId = (await getCurrentUserId())!;
  const [overview, series] = await Promise.all([
    getOverview(userId),
    getSeries(userId, 7),
  ]);

  if (!overview.analytics) {
    return (
      <>
        <PageHeader
          title="Overview"
          subtitle="Your attention intelligence, at a glance."
        />
        <EmptyState
          icon={Sparkles}
          title="No activity yet"
          description="Install the FocusLens extension to start capturing real attention data, or seed 30 days of realistic demo data to explore the platform instantly."
          action={<SeedDemoButton />}
        />
        <div className="mt-5">
          <ConnectExtension defaultOpen />
        </div>
      </>
    );
  }

  const a = overview.analytics;
  const prev = overview.prevAnalytics;
  const score = overview.score;

  const scoreDelta = prev ? a.productivityScore - prev.productivityScore : undefined;
  const focusDelta =
    prev && prev.focusSeconds > 0
      ? Math.round(((a.focusSeconds - prev.focusSeconds) / prev.focusSeconds) * 100)
      : undefined;

  const trend = series.map((d) => ({
    label: new Date(d.date).toLocaleDateString(undefined, { weekday: "short" }),
    productivity: d.productivityScore,
    focus: d.focusScore,
  }));

  const categoryData = Object.entries(
    (a.categoryBreakdown as Record<string, number>) ?? {},
  ).map(([category, seconds]) => ({ category, seconds }));

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle={new Date(a.date).toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
        action={
          <Badge variant="secondary" className="h-8 px-3">
            <Clock3 className="h-3.5 w-3.5" />
            {fmtDuration(a.totalSeconds)} online today
          </Badge>
        }
      />

      {/* Hero: score + key stats */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="flex flex-col items-center justify-center gap-4 p-6 lg:row-span-1">
          <ScoreRing value={a.productivityScore} sublabel="score / 100" />
          {score?.explanation && (
            <p className="text-center text-xs leading-relaxed text-muted-foreground">
              {score.explanation}
            </p>
          )}
        </Card>

        <div className="grid grid-cols-2 gap-5 lg:col-span-2">
          <StatCard
            index={0}
            label="Focus time"
            value={fmtDuration(a.focusSeconds)}
            icon="Timer"
            accent="cyan"
            delta={focusDelta}
            hint="Time inside focus sessions"
          />
          <StatCard
            index={1}
            label="Deep work"
            value={fmtDuration(a.deepWorkSeconds)}
            icon="Brain"
            accent="primary"
            hint="Sessions ≥ 45 min"
          />
          <StatCard
            index={2}
            label="Goal alignment"
            value={`${Math.round(overview.averageGoalProgress * 100)}%`}
            icon="Target"
            accent="emerald"
            hint={`${overview.goals.length} active goals`}
          />
          <StatCard
            index={3}
            label="Attention leaks"
            value={String(a.attentionLeaks)}
            icon="Unplug"
            accent="rose"
            hint={`${a.contextSwitches} context switches`}
          />
        </div>
      </div>

      {/* Daily AI summary */}
      {overview.summary && (
        <Card interactive className="mt-5 p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/25">
              <Sparkles className="h-4.5 w-4.5 text-primary" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium">Daily Intelligence</h3>
                <Badge variant={overview.summary.source === "AI" ? "default" : "outline"}>
                  {overview.summary.source === "AI" ? "AI" : "Computed"}
                </Badge>
                {typeof scoreDelta === "number" && (
                  <Badge variant={scoreDelta >= 0 ? "success" : "warning"}>
                    <TrendingUp className="h-3 w-3" />
                    {scoreDelta >= 0 ? "+" : ""}
                    {scoreDelta} vs yesterday
                  </Badge>
                )}
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {overview.summary.body}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Trend + category */}
      <div className="mt-5 grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>7-day productivity & focus</CardTitle>
          </CardHeader>
          <CardContent>
            <ProductivityTrend data={trend} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Today by category</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryDonut data={categoryData} />
            <div className="mt-3 flex flex-wrap gap-2">
              {[...categoryData]
                .sort((x, y) => y.seconds - x.seconds)
                .slice(0, 5)
                .map(({ category, seconds }) => {
                  const meta = CATEGORY_META[category as keyof typeof CATEGORY_META];
                  return (
                    <span key={category} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="h-2 w-2 rounded-full" style={{ background: meta?.color }} />
                      {meta?.label ?? category} · {fmtDuration(seconds)}
                    </span>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Focus sessions + goals */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s focus sessions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {overview.focusSessions.length === 0 && (
              <p className="text-sm text-muted-foreground">No focus sessions detected yet today.</p>
            )}
            {overview.focusSessions.slice(0, 4).map((s) => {
              const meta = CATEGORY_META[s.primaryCategory];
              return (
                <div key={s.id} className="flex items-center gap-3 rounded-xl border border-border/50 bg-secondary/20 p-3">
                  <span className="text-lg">{meta.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{s.primaryDomain}</div>
                    <div className="text-xs text-muted-foreground">
                      {fmtTime(s.startTime)} – {fmtTime(s.endTime)} · {meta.label}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold tabular-nums">{fmtDuration(s.duration)}</div>
                    <div className="text-xs text-muted-foreground">{s.productivityScore}/100</div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Goal progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {overview.goalProgress.length === 0 && (
              <p className="text-sm text-muted-foreground">No goals set yet.</p>
            )}
            {overview.goalProgress.map((g) => (
              <div key={g.goalId}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium">{g.title}</span>
                  <span className="text-muted-foreground">
                    {fmtHours(g.actualSeconds)} / {fmtHours(g.targetSeconds)}
                  </span>
                </div>
                <Progress
                  value={g.alignment}
                  indicatorClassName={
                    g.onTrack ? "bg-emerald-400" : g.alignment > 50 ? "bg-primary" : "bg-amber-400"
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-5">
        <ConnectExtension defaultOpen={overview.analytics === null} />
      </div>
    </>
  );
}
