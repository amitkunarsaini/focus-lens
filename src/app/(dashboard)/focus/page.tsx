import { Timer } from "lucide-react";
import { getCurrentUserId } from "@/lib/auth";
import { getFocusSessions } from "@/lib/data";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SeedDemoButton } from "@/components/dashboard/seed-demo-button";
import { CATEGORY_META } from "@/lib/classify";
import { fmtDuration, fmtTime } from "@/lib/utils";
import { FOCUS_CONFIG } from "@/lib/analytics/focus-sessions";

export const dynamic = "force-dynamic";

export default async function FocusPage() {
  const userId = (await getCurrentUserId())!;
  const sessions = await getFocusSessions(userId, 30);

  if (sessions.length === 0) {
    return (
      <>
        <PageHeader title="Focus Sessions" subtitle="Your detected deep-work blocks." />
        <EmptyState
          icon={Timer}
          title="No focus sessions yet"
          description="FocusLens automatically detects sustained productive work (15+ minutes). They'll show up here as you build them."
          action={<SeedDemoButton />}
        />
      </>
    );
  }

  const total = sessions.reduce((s, x) => s + x.duration, 0);
  const deep = sessions.filter((s) => s.duration >= FOCUS_CONFIG.deepWorkSeconds);
  const longest = sessions[0]; // sorted by duration desc
  const avgScore = Math.round(
    sessions.reduce((s, x) => s + x.productivityScore, 0) / sessions.length,
  );

  // Group "best focus periods" — by hour of day.
  const byHour = new Map<number, number>();
  for (const s of sessions) {
    const h = new Date(s.startTime).getHours();
    byHour.set(h, (byHour.get(h) ?? 0) + s.duration);
  }
  const bestHours = [...byHour.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <>
      <PageHeader title="Focus Sessions" subtitle="Your detected deep-work blocks over 30 days." />

      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        <StatCard index={0} label="Total focus time" value={fmtDuration(total)} icon="Timer" accent="cyan" />
        <StatCard index={1} label="Deep work sessions" value={String(deep.length)} icon="Brain" accent="primary" hint="≥ 45 minutes" />
        <StatCard index={2} label="Longest session" value={fmtDuration(longest.duration)} icon="Trophy" accent="amber" hint={longest.primaryDomain} />
        <StatCard index={3} label="Avg quality" value={`${avgScore}/100`} icon="Flame" accent="emerald" />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>All sessions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {sessions.map((s) => {
              const meta = CATEGORY_META[s.primaryCategory];
              const isDeep = s.duration >= FOCUS_CONFIG.deepWorkSeconds;
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-3 rounded-xl border border-border/50 bg-secondary/15 p-3"
                >
                  <span className="text-lg">{meta.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{s.primaryDomain}</span>
                      {isDeep && <Badge variant="default">Deep work</Badge>}
                      {s.interruptions > 0 && (
                        <Badge variant="warning">{s.interruptions} interruptions</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(s.startTime).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      {" · "}
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
            <CardTitle>Best focus periods</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              When your deep work most often happens — protect these windows.
            </p>
            {bestHours.map(([hour, secs]) => {
              const max = bestHours[0][1];
              const label = `${hour % 12 === 0 ? 12 : hour % 12}:00 ${hour < 12 ? "AM" : "PM"}`;
              return (
                <div key={hour}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium">{label}</span>
                    <span className="text-muted-foreground">{fmtDuration(secs)}</span>
                  </div>
                  <Progress value={(secs / max) * 100} indicatorClassName="bg-cyan-400" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
