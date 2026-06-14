import { BarChart3 } from "lucide-react";
import { getCurrentUserId } from "@/lib/auth";
import { getSeries } from "@/lib/data";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { AnalyticsView, type DayPoint } from "@/components/dashboard/analytics-view";
import { SeedDemoButton } from "@/components/dashboard/seed-demo-button";
import { CategoryOverrides } from "@/components/dashboard/category-overrides";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const userId = (await getCurrentUserId())!;
  const series = await getSeries(userId, 30);

  if (series.length === 0) {
    return (
      <>
        <PageHeader title="Analytics" subtitle="Trends across your attention over time." />
        <EmptyState
          icon={BarChart3}
          title="No analytics yet"
          description="Once data flows in from the extension (or demo mode), your daily, weekly and monthly trends appear here."
          action={<SeedDemoButton />}
        />
      </>
    );
  }

  const days: DayPoint[] = series.map((d) => ({
    date: d.date.toISOString(),
    productivityScore: d.productivityScore,
    focusScore: d.focusScore,
    contextSwitches: d.contextSwitches,
    categoryBreakdown: d.categoryBreakdown as Record<string, number>,
    domainBreakdown: d.domainBreakdown as Record<string, number>,
    hourlyBreakdown: d.hourlyBreakdown as DayPoint["hourlyBreakdown"],
  }));

  return (
    <>
      <PageHeader title="Analytics" subtitle="Trends across your attention over time." />
      <AnalyticsView days={days} />
      <div className="mt-5">
        <CategoryOverrides />
      </div>
    </>
  );
}
