import { Category, Productivity } from "@prisma/client";

/** Minimal shape of a browsing span the engines operate on. */
export interface EventLike {
  url: string;
  title: string;
  domain: string;
  category: Category;
  startTime: Date;
  endTime: Date;
  duration: number; // seconds
}

export interface FocusSessionResult {
  startTime: Date;
  endTime: Date;
  duration: number;
  primaryCategory: Category;
  primaryDomain: string;
  productivityScore: number;
  interruptions: number;
  eventCount: number;
  domains: string[];
}

export interface AttentionLeakResult {
  startTime: Date;
  endTime: Date;
  primaryCategory: Category;
  primaryDomain: string;
  interruptions: number;
  lostSeconds: number;
  recoverySeconds: number;
  triggers: string[];
}

export interface ContextSwitchResult {
  totalSwitches: number;
  domainSwitches: number;
  productiveToDistracting: number;
  score: number; // 0–100, higher = more sustained attention
  switchesPerActiveHour: number;
}

export interface ProductivityResult {
  score: number; // 0–100
  focusComponent: number;
  switchingComponent: number;
  idleComponent: number;
  categoryComponent: number;
  goalComponent: number;
  explanation: string;
}

export interface CategoryTotals {
  byCategory: Record<string, number>;
  byProductivity: Record<Productivity, number>;
  byDomain: Record<string, number>;
}
