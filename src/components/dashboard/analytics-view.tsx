"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ProductivityTrend,
  CategoryDonut,
  HourlyFocusBar,
  ContextSwitchTrend,
} from "@/components/charts/charts";
import { CATEGORY_META, classify } from "@/lib/classify";
import { fmtDuration, fmtPct } from "@/lib/utils";
import { Globe } from "lucide-react";

export interface DayPoint {
  date: string;
  productivityScore: number;
  focusScore: number;
  contextSwitches: number;
  categoryBreakdown: Record<string, number>;
  domainBreakdown: Record<string, number>;
  hourlyBreakdown: Array<{ hour: number; productive: number; neutral: number; distracting: number }>;
}

export function AnalyticsView({ days }: { days: DayPoint[] }) {
  const [range, setRange] = useState<"7" | "30">("30");
  const sliced = useMemo(
    () => (range === "7" ? days.slice(-7) : days),
    [days, range],
  );

  const trend = sliced.map((d) => ({
    label: new Date(d.date).toLocaleDateString(undefined, { month: "numeric", day: "numeric" }),
    productivity: d.productivityScore,
    focus: d.focusScore,
  }));

  const switches = sliced.map((d) => ({
    label: new Date(d.date).toLocaleDateString(undefined, { month: "numeric", day: "numeric" }),
    switches: d.contextSwitches,
  }));

  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const d of sliced) {
      for (const [cat, secs] of Object.entries(d.categoryBreakdown ?? {})) {
        totals[cat] = (totals[cat] ?? 0) + secs;
      }
    }
    return Object.entries(totals).map(([category, seconds]) => ({ category, seconds }));
  }, [sliced]);

  // Per-website time spent across the range, classified for colour-coding.
  const websites = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const d of sliced) {
      for (const [domain, secs] of Object.entries(d.domainBreakdown ?? {})) {
        totals[domain] = (totals[domain] ?? 0) + secs;
      }
    }
    const rows = Object.entries(totals)
      .map(([domain, seconds]) => ({
        domain,
        seconds,
        category: classify({ url: `https://${domain}`, domain }),
      }))
      .sort((a, b) => b.seconds - a.seconds);
    const total = rows.reduce((s, r) => s + r.seconds, 0) || 1;
    return { rows, total };
  }, [sliced]);

  // Average hourly distribution across the range.
  const hourly = useMemo(() => {
    const acc = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      productive: 0,
      neutral: 0,
      distracting: 0,
    }));
    for (const d of sliced) {
      (d.hourlyBreakdown ?? []).forEach((h, i) => {
        if (!acc[i]) return;
        acc[i].productive += h.productive;
        acc[i].neutral += h.neutral;
        acc[i].distracting += h.distracting;
      });
    }
    const n = Math.max(sliced.length, 1);
    return acc.map((h) => ({
      hour: h.hour,
      productive: h.productive / n,
      neutral: h.neutral / n,
      distracting: h.distracting / n,
    }));
  }, [sliced]);

  return (
    <div className="space-y-5">
      <Tabs value={range} onValueChange={(v) => setRange(v as "7" | "30")}>
        <TabsList>
          <TabsTrigger value="7">Last 7 days</TabsTrigger>
          <TabsTrigger value="30">Last 30 days</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Productivity & focus trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductivityTrend data={trend} />
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Average day — when attention happens</CardTitle>
          </CardHeader>
          <CardContent>
            <HourlyFocusBar data={hourly} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Category breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryDonut data={categoryTotals} />
            <div className="mt-3 space-y-1.5">
              {categoryTotals
                .sort((a, b) => b.seconds - a.seconds)
                .slice(0, 6)
                .map(({ category, seconds }) => {
                  const meta = CATEGORY_META[category as keyof typeof CATEGORY_META];
                  return (
                    <div key={category} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="h-2 w-2 rounded-full" style={{ background: meta?.color }} />
                        {meta?.label ?? category}
                      </span>
                      <span className="tabular-nums">{fmtDuration(seconds)}</span>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Context-switching trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ContextSwitchTrend data={switches} />
        </CardContent>
      </Card>

      {/* Per-website time spent */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Globe className="h-4 w-4 text-primary" />
            Top websites by time
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Where your attention went over the last {range} days, ranked by time.
          </p>
        </CardHeader>
        <CardContent>
          {websites.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No website activity in this range.</p>
          ) : (
            <div className="space-y-2.5">
              {websites.rows.slice(0, 20).map((w, i) => {
                const meta = CATEGORY_META[w.category];
                const pct = (w.seconds / websites.total) * 100;
                return (
                  <div key={w.domain} className="flex items-center gap-3">
                    <span className="w-5 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="text-base">{meta.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">{w.domain}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          <span className="tabular-nums text-foreground">{fmtDuration(w.seconds)}</span>
                          {" · "}
                          {fmtPct(pct)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: meta.color }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
