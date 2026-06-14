"use client";

import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  Timer,
  Brain,
  Target,
  Unplug,
  Trophy,
  Flame,
  Clock3,
  Activity,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Icon registry — Server Components pass an icon *name* (a string) rather than
 * a Lucide component function, since functions can't cross the RSC → Client
 * boundary in React 19.
 */
const ICONS = {
  Timer,
  Brain,
  Target,
  Unplug,
  Trophy,
  Flame,
  Clock3,
  Activity,
} satisfies Record<string, LucideIcon>;

export type StatIcon = keyof typeof ICONS;

export function StatCard({
  label,
  value,
  icon,
  delta,
  hint,
  accent = "primary",
  index = 0,
}: {
  label: string;
  value: string;
  icon: StatIcon;
  delta?: number; // signed percentage points/percent
  hint?: string;
  accent?: "primary" | "cyan" | "emerald" | "amber" | "rose";
  index?: number;
}) {
  const Icon = ICONS[icon];
  const accentMap: Record<string, string> = {
    primary: "text-primary bg-primary/15 ring-primary/25",
    cyan: "text-cyan-400 bg-cyan-400/15 ring-cyan-400/25",
    emerald: "text-emerald-400 bg-emerald-400/15 ring-emerald-400/25",
    amber: "text-amber-400 bg-amber-400/15 ring-amber-400/25",
    rose: "text-rose-400 bg-rose-400/15 ring-rose-400/25",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
    >
      <Card interactive className="p-5">
        <div className="flex items-start justify-between">
          <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl ring-1", accentMap[accent])}>
            <Icon className="h-5 w-5" />
          </span>
          {typeof delta === "number" && (
            <span
              className={cn(
                "flex items-center gap-0.5 text-xs font-medium",
                delta >= 0 ? "text-emerald-400" : "text-rose-400",
              )}
            >
              {delta >= 0 ? (
                <ArrowUpRight className="h-3.5 w-3.5" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5" />
              )}
              {Math.abs(delta)}%
            </span>
          )}
        </div>
        <div className="mt-4 text-2xl font-semibold tracking-tight tabular-nums">
          {value}
        </div>
        <div className="mt-0.5 text-sm text-muted-foreground">{label}</div>
        {hint && <div className="mt-1 text-xs text-muted-foreground/70">{hint}</div>}
      </Card>
    </motion.div>
  );
}
