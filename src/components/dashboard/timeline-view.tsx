"use client";

import { motion } from "framer-motion";
import { Unplug, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_META, CATEGORY_PRODUCTIVITY } from "@/lib/classify";
import { fmtDuration, fmtTime, truncate } from "@/lib/utils";

export interface TimelineEvent {
  id: string;
  domain: string;
  title: string;
  category: keyof typeof CATEGORY_META;
  startTime: string;
  endTime: string;
  duration: number;
}
export interface TimelineSession {
  id: string;
  startTime: string;
  endTime: string;
  duration: number;
  primaryDomain: string;
  primaryCategory: keyof typeof CATEGORY_META;
  interruptions: number;
}
export interface TimelineLeak {
  id: string;
  startTime: string;
  interruptions: number;
  recoverySeconds: number;
  triggers: string[];
  primaryDomain: string;
}

export function TimelineView({
  events,
  sessions,
  leaks,
}: {
  events: TimelineEvent[];
  sessions: TimelineSession[];
  leaks: TimelineLeak[];
}) {
  const sessionByStart = new Map(sessions.map((s) => [s.startTime, s]));
  const leakByStart = new Map(leaks.map((l) => [l.startTime, l]));

  return (
    <div className="relative pl-6">
      {/* vertical rail */}
      <div className="absolute bottom-2 left-[7px] top-2 w-px bg-border" />

      <div className="space-y-2">
        {events.map((e, i) => {
          const meta = CATEGORY_META[e.category];
          const bucket = CATEGORY_PRODUCTIVITY[e.category];
          const session = sessionByStart.get(e.startTime);
          const leak = leakByStart.get(e.startTime);
          return (
            <div key={e.id} className="relative">
              {session && (
                <div className="mb-2 ml-[-6px] flex items-center gap-2 rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-3 py-1.5 text-xs">
                  <Zap className="h-3.5 w-3.5 text-cyan-400" />
                  <span className="font-medium text-cyan-200">
                    Focus session started · {fmtDuration(session.duration)}
                  </span>
                  {session.interruptions > 0 && (
                    <Badge variant="warning">{session.interruptions} interruptions</Badge>
                  )}
                </div>
              )}
              {leak && (
                <div className="mb-2 ml-[-6px] flex items-center gap-2 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-1.5 text-xs">
                  <Unplug className="h-3.5 w-3.5 text-rose-400" />
                  <span className="font-medium text-rose-200">
                    Attention leak · {leak.interruptions}× interrupted, ~{fmtDuration(leak.recoverySeconds)} to refocus
                  </span>
                </div>
              )}

              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: Math.min(i * 0.012, 0.4) }}
                className="group flex items-center gap-3"
              >
                <span
                  className="absolute left-[-22px] mt-0.5 h-3.5 w-3.5 rounded-full ring-4 ring-background"
                  style={{ background: meta.color }}
                />
                <div className="flex flex-1 items-center gap-3 rounded-xl border border-border/40 bg-secondary/15 px-3 py-2 transition-colors group-hover:border-border">
                  <span className="text-base">{meta.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{truncate(e.title || e.domain, 60)}</div>
                    <div className="text-xs text-muted-foreground">{e.domain}</div>
                  </div>
                  <div className="hidden sm:block">
                    <Badge
                      variant={
                        bucket === "Productive" ? "success" : bucket === "Distracting" ? "danger" : "outline"
                      }
                    >
                      {meta.label}
                    </Badge>
                  </div>
                  <div className="w-20 text-right text-xs text-muted-foreground">
                    <div className="font-medium text-foreground">{fmtDuration(e.duration)}</div>
                    {fmtTime(e.startTime)}
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>

      {events.length === 0 && (
        <Card className="py-12 text-center text-sm text-muted-foreground">
          No activity recorded for this day.
        </Card>
      )}
    </div>
  );
}
