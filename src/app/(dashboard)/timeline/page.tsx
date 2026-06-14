import { Activity } from "lucide-react";
import { getCurrentUserId } from "@/lib/auth";
import { getTimeline, getActiveDate } from "@/lib/data";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Badge } from "@/components/ui/badge";
import { SeedDemoButton } from "@/components/dashboard/seed-demo-button";
import { TimelineView } from "@/components/dashboard/timeline-view";
import type { CATEGORY_META } from "@/lib/classify";

export const dynamic = "force-dynamic";

type Cat = keyof typeof CATEGORY_META;

export default async function TimelinePage() {
  const userId = (await getCurrentUserId())!;
  const date = await getActiveDate(userId);
  const { events, focusSessions, leaks } = await getTimeline(userId, date);

  if (events.length === 0) {
    return (
      <>
        <PageHeader title="Timeline" subtitle="A minute-by-minute view of your attention." />
        <EmptyState
          icon={Activity}
          title="No timeline yet"
          description="Your browsing sessions, focus blocks and interruptions will appear here once data is collected."
          action={<SeedDemoButton />}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Timeline"
        subtitle={new Date(date).toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
        action={
          <div className="flex gap-2">
            <Badge variant="secondary">{events.length} events</Badge>
            <Badge variant="default">{focusSessions.length} focus blocks</Badge>
            <Badge variant="danger">{leaks.length} leaks</Badge>
          </div>
        }
      />
      <TimelineView
        events={[...events].reverse().map((e) => ({
          id: e.id,
          domain: e.domain,
          title: e.title,
          category: e.category as Cat,
          startTime: e.startTime.toISOString(),
          endTime: e.endTime.toISOString(),
          duration: e.duration,
        }))}
        sessions={focusSessions.map((s) => ({
          id: s.id,
          startTime: s.startTime.toISOString(),
          endTime: s.endTime.toISOString(),
          duration: s.duration,
          primaryDomain: s.primaryDomain,
          primaryCategory: s.primaryCategory as Cat,
          interruptions: s.interruptions,
        }))}
        leaks={leaks.map((l) => ({
          id: l.id,
          startTime: l.startTime.toISOString(),
          interruptions: l.interruptions,
          recoverySeconds: l.recoverySeconds,
          triggers: l.triggers,
          primaryDomain: l.primaryDomain,
        }))}
      />
    </>
  );
}
