import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Human-readable duration from seconds: 5400 → "1h 30m". */
export function fmtDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

/** Compact hours, e.g. 5400 → "1.5h". */
export function fmtHours(seconds: number): string {
  return `${(seconds / 3600).toFixed(1)}h`;
}

export function fmtTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function fmtPct(n: number): string {
  return `${Math.round(n)}%`;
}

/** Truncate a string to a max length with an ellipsis. */
export function truncate(s: string, max = 48): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/**
 * Day-bucketing is done in UTC so it survives Prisma's `@db.Date` truncation
 * (which drops the time component using the UTC date). Using local midnight
 * here would write one date and read back another whenever the offset crosses
 * midnight UTC.
 */

/** UTC YYYY-MM-DD key for a date. */
export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Midnight UTC of the given date. */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
