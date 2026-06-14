"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Loader2, SlidersHorizontal, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CATEGORY_META } from "@/lib/classify";

interface Override {
  id: string;
  domain: string;
  category: keyof typeof CATEGORY_META;
}

const CATEGORIES = Object.keys(CATEGORY_META) as Array<keyof typeof CATEGORY_META>;

export function CategoryOverrides() {
  const router = useRouter();
  const qc = useQueryClient();
  const [domain, setDomain] = useState("");
  const [category, setCategory] = useState<keyof typeof CATEGORY_META>("Development");

  const { data, isLoading } = useQuery<{ overrides: Override[] }>({
    queryKey: ["overrides"],
    queryFn: async () => {
      const res = await fetch("/api/overrides");
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, category }),
      });
      if (!res.ok) throw new Error("failed");
    },
    onSuccess: () => {
      setDomain("");
      qc.invalidateQueries({ queryKey: ["overrides"] });
      router.refresh();
    },
  });

  const remove = useMutation({
    mutationFn: async (d: string) => {
      const res = await fetch(`/api/overrides?domain=${encodeURIComponent(d)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["overrides"] });
      router.refresh();
    },
  });

  const overrides = data?.overrides ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          Category overrides
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Pin a domain to a category. Applied retroactively — existing activity is re-classified and analytics recomputed.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="e.g. news.ycombinator.com"
            className="h-10 flex-1 rounded-xl border border-border bg-secondary/40 px-3 text-sm outline-none focus:border-primary/50"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as keyof typeof CATEGORY_META)}
            className="h-10 rounded-xl border border-border bg-secondary/40 px-3 text-sm outline-none focus:border-primary/50"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_META[c].label}
              </option>
            ))}
          </select>
          <Button onClick={() => save.mutate()} disabled={!domain.trim() || save.isPending}>
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : overrides.length === 0 ? (
          <p className="text-sm text-muted-foreground">No overrides yet. The rule-based classifier handles everything by default.</p>
        ) : (
          <div className="space-y-2">
            {overrides.map((o) => {
              const meta = CATEGORY_META[o.category];
              return (
                <div
                  key={o.id}
                  className="flex items-center gap-3 rounded-xl border border-border/50 bg-secondary/20 px-3 py-2"
                >
                  <span className="text-base">{meta.emoji}</span>
                  <span className="flex-1 truncate text-sm font-medium">{o.domain}</span>
                  <span
                    className="flex items-center gap-1.5 text-xs text-muted-foreground"
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: meta.color }} />
                    {meta.label}
                  </span>
                  <button
                    onClick={() => remove.mutate(o.domain)}
                    disabled={remove.isPending}
                    className="text-muted-foreground transition-colors hover:text-rose-400"
                    aria-label={`Remove override for ${o.domain}`}
                  >
                    {remove.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {save.isSuccess && (
          <p className="flex items-center gap-1.5 text-xs text-emerald-400">
            <Check className="h-3.5 w-3.5" /> Saved and re-classified.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
