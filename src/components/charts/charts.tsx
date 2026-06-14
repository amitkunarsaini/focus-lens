"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart,
} from "recharts";
import { CATEGORY_META } from "@/lib/classify";
import { fmtDuration } from "@/lib/utils";

const axisProps = {
  stroke: "hsl(220 12% 50%)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color?: string; payload?: Record<string, unknown> }>;
  label?: string | number;
  formatter?: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      {label !== undefined && <div className="mb-1 font-medium">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}</span>
          <span className="ml-auto font-medium tabular-nums">
            {formatter ? formatter(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export interface TrendPoint {
  label: string;
  productivity: number;
  focus: number;
}

export function ProductivityTrend({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="gradProd" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(258 90% 66%)" stopOpacity={0.5} />
            <stop offset="100%" stopColor="hsl(258 90% 66%)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradFocus" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(190 90% 50%)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="hsl(190 90% 50%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="label" {...axisProps} />
        <YAxis domain={[0, 100]} {...axisProps} width={32} />
        <Tooltip content={<ChartTooltip />} />
        <Area
          type="monotone"
          dataKey="productivity"
          name="Productivity"
          stroke="hsl(258 90% 70%)"
          strokeWidth={2}
          fill="url(#gradProd)"
        />
        <Area
          type="monotone"
          dataKey="focus"
          name="Focus"
          stroke="hsl(190 90% 60%)"
          strokeWidth={2}
          fill="url(#gradFocus)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function CategoryDonut({
  data,
}: {
  data: Array<{ category: string; seconds: number }>;
}) {
  const sorted = [...data].sort((a, b) => b.seconds - a.seconds);
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={sorted}
          dataKey="seconds"
          nameKey="category"
          cx="50%"
          cy="50%"
          innerRadius={62}
          outerRadius={92}
          paddingAngle={2}
          stroke="none"
        >
          {sorted.map((entry) => (
            <Cell
              key={entry.category}
              fill={
                CATEGORY_META[entry.category as keyof typeof CATEGORY_META]?.color ??
                "#64748b"
              }
            />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip formatter={fmtDuration} />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function HourlyFocusBar({
  data,
}: {
  data: Array<{ hour: number; productive: number; neutral: number; distracting: number }>;
}) {
  const fmt = data.map((d) => ({
    label: `${d.hour}`,
    Productive: Math.round(d.productive / 60),
    Neutral: Math.round(d.neutral / 60),
    Distracting: Math.round(d.distracting / 60),
  }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={fmt} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} barCategoryGap={2}>
        <XAxis dataKey="label" {...axisProps} interval={2} />
        <YAxis {...axisProps} width={32} unit="m" />
        <Tooltip content={<ChartTooltip formatter={(v) => `${v}m`} />} cursor={{ fill: "hsl(230 16% 18% / 0.4)" }} />
        <Bar dataKey="Productive" stackId="a" fill="hsl(258 90% 66%)" radius={[0, 0, 0, 0]} />
        <Bar dataKey="Neutral" stackId="a" fill="hsl(190 70% 45%)" />
        <Bar dataKey="Distracting" stackId="a" fill="hsl(0 72% 56%)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ContextSwitchTrend({
  data,
}: {
  data: Array<{ label: string; switches: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <XAxis dataKey="label" {...axisProps} />
        <YAxis {...axisProps} width={32} />
        <Tooltip content={<ChartTooltip />} />
        <Line
          type="monotone"
          dataKey="switches"
          name="Context switches"
          stroke="hsl(38 92% 58%)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
