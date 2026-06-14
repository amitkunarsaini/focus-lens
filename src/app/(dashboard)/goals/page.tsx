import { getCurrentUserId } from "@/lib/auth";
import { getOverview } from "@/lib/data";
import { PageHeader } from "@/components/dashboard/page-header";
import { GoalsView, type GoalRow } from "@/components/dashboard/goals-view";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const userId = (await getCurrentUserId())!;
  const overview = await getOverview(userId);

  const goals: GoalRow[] = overview.goals.map((g) => {
    const p = overview.goalProgress.find((x) => x.goalId === g.id);
    return {
      id: g.id,
      title: g.title,
      type: g.type,
      direction: g.direction,
      targetSeconds: g.targetSeconds,
      actualSeconds: p?.actualSeconds ?? 0,
      alignment: p?.alignment ?? 0,
      onTrack: p?.onTrack ?? false,
    };
  });

  return (
    <>
      <PageHeader
        title="Goals"
        subtitle="Define what matters, then see how your real behaviour measures up."
      />
      <GoalsView goals={goals} averageProgress={overview.averageGoalProgress} />
    </>
  );
}
