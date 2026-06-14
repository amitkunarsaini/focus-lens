"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { FlaskConical, Radio, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shows LIVE/DEMO state and lets the user toggle demo data. */
export function ModeBadge({ mode }: { mode: "LIVE" | "DEMO" }) {
  const router = useRouter();

  const seed = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/demo", { method: "POST" });
      if (!res.ok) throw new Error("failed");
    },
    onSuccess: () => router.refresh(),
  });

  const clear = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/demo", { method: "DELETE" });
      if (!res.ok) throw new Error("failed");
    },
    onSuccess: () => router.refresh(),
  });

  const busy = seed.isPending || clear.isPending;

  return (
    <div className="rounded-xl border border-border/60 bg-secondary/30 p-2.5">
      <div className="flex items-center gap-2 px-1">
        {mode === "DEMO" ? (
          <FlaskConical className="h-4 w-4 text-amber-400" />
        ) : (
          <Radio className="h-4 w-4 text-emerald-400" />
        )}
        <span className="text-xs font-medium">
          {mode === "DEMO" ? "Demo Mode" : "Live Mode"}
        </span>
        <span
          className={cn(
            "ml-auto h-2 w-2 rounded-full",
            mode === "DEMO" ? "bg-amber-400" : "bg-emerald-400 animate-pulse",
          )}
        />
      </div>
      <button
        disabled={busy}
        onClick={() => (mode === "DEMO" ? clear.mutate() : seed.mutate())}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-secondary/80 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
      >
        {busy && <Loader2 className="h-3 w-3 animate-spin" />}
        {mode === "DEMO" ? "Switch to Live data" : "Explore with demo data"}
      </button>
    </div>
  );
}
