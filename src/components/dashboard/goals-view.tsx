"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Plus, Trash2, Target, Loader2, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { fmtHours } from "@/lib/utils";

export interface GoalRow {
  id: string;
  title: string;
  type: string;
  direction: string;
  targetSeconds: number;
  actualSeconds: number;
  alignment: number;
  onTrack: boolean;
}

const GOAL_TYPES = [
  { value: "LEARN_TOPIC", label: "Learn a topic", direction: "AT_LEAST" },
  { value: "DEEP_WORK", label: "Deep work", direction: "AT_LEAST" },
  { value: "CATEGORY_TIME", label: "Spend time on category", direction: "AT_LEAST" },
  { value: "LIMIT_CATEGORY", label: "Limit a category", direction: "AT_MOST" },
];

const CATEGORIES = [
  "SocialMedia", "Entertainment", "Learning", "Development",
  "Work", "Research", "Documentation", "News", "Communication", "Shopping",
];

export function GoalsView({ goals, averageProgress }: { goals: GoalRow[]; averageProgress: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    type: "LEARN_TOPIC",
    targetHours: 2,
    targetCategory: "Learning",
    keywords: "",
  });

  const create = useMutation({
    mutationFn: async () => {
      const typeMeta = GOAL_TYPES.find((t) => t.value === form.type)!;
      const body: Record<string, unknown> = {
        title: form.title,
        type: form.type,
        direction: typeMeta.direction,
        period: "DAILY",
        targetSeconds: Math.round(form.targetHours * 3600),
        keywords: form.keywords ? form.keywords.split(",").map((k) => k.trim()).filter(Boolean) : [],
      };
      if (form.type === "CATEGORY_TIME" || form.type === "LIMIT_CATEGORY") {
        body.targetCategory = form.targetCategory;
      }
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("failed");
    },
    onSuccess: () => {
      setOpen(false);
      setForm({ title: "", type: "LEARN_TOPIC", targetHours: 2, targetCategory: "Learning", keywords: "" });
      router.refresh();
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/goals/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("failed");
    },
    onSuccess: () => router.refresh(),
  });

  const needsCategory = form.type === "CATEGORY_TIME" || form.type === "LIMIT_CATEGORY";
  const needsKeywords = form.type === "LEARN_TOPIC";

  return (
    <div className="space-y-5">
      <Card className="flex items-center justify-between p-5">
        <div>
          <div className="text-sm text-muted-foreground">Overall goal alignment</div>
          <div className="text-3xl font-semibold tabular-nums">{Math.round(averageProgress * 100)}%</div>
        </div>
        <Button onClick={() => setOpen((o) => !o)} variant={open ? "secondary" : "default"}>
          {open ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {open ? "Cancel" : "New goal"}
        </Button>
      </Card>

      {open && (
        <Card className="animate-fade-in p-5">
          <CardTitle className="mb-4 text-foreground">Create a goal</CardTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-xs text-muted-foreground">Title</span>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Learn AI for 2 hours daily"
                className="h-10 rounded-xl border border-border bg-secondary/40 px-3 text-sm outline-none focus:border-primary/50"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">Type</span>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="h-10 rounded-xl border border-border bg-secondary/40 px-3 text-sm outline-none focus:border-primary/50"
              >
                {GOAL_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">Target hours / day</span>
              <input
                type="number"
                min={0.25}
                step={0.25}
                value={form.targetHours}
                onChange={(e) => setForm({ ...form, targetHours: Number(e.target.value) })}
                className="h-10 rounded-xl border border-border bg-secondary/40 px-3 text-sm outline-none focus:border-primary/50"
              />
            </label>
            {needsCategory && (
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">Category</span>
                <select
                  value={form.targetCategory}
                  onChange={(e) => setForm({ ...form, targetCategory: e.target.value })}
                  className="h-10 rounded-xl border border-border bg-secondary/40 px-3 text-sm outline-none focus:border-primary/50"
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
            )}
            {needsKeywords && (
              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className="text-xs text-muted-foreground">Keywords (comma-separated)</span>
                <input
                  value={form.keywords}
                  onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                  placeholder="ai, machine learning, system design"
                  className="h-10 rounded-xl border border-border bg-secondary/40 px-3 text-sm outline-none focus:border-primary/50"
                />
              </label>
            )}
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={() => create.mutate()} disabled={!form.title || create.isPending}>
              {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Create goal
            </Button>
          </div>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {goals.map((g) => (
          <Card key={g.id} interactive className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <h3 className="font-medium">{g.title}</h3>
              </div>
              <button
                onClick={() => remove.mutate(g.id)}
                className="text-muted-foreground transition-colors hover:text-rose-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <Badge variant={g.onTrack ? "success" : "warning"}>
                {g.onTrack ? "On track" : "Behind"}
              </Badge>
              <span className="text-muted-foreground">
                {fmtHours(g.actualSeconds)} / {fmtHours(g.targetSeconds)}
                {g.direction === "AT_MOST" ? " max" : ""}
              </span>
            </div>
            <Progress
              className="mt-2"
              value={g.alignment}
              indicatorClassName={g.onTrack ? "bg-emerald-400" : g.alignment > 50 ? "bg-primary" : "bg-amber-400"}
            />
          </Card>
        ))}
      </div>
    </div>
  );
}
