import { z } from "zod";

/** A single browsing span posted by the extension. */
export const ingestEventSchema = z.object({
  url: z.string().url().max(2048),
  title: z.string().max(1024).default(""),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  duration: z.number().int().min(1).max(24 * 3600),
  tabId: z.number().int().optional(),
  windowId: z.number().int().optional(),
  endReason: z.string().max(40).optional(),
  fromDomain: z.string().max(255).optional(),
});

export const ingestBatchSchema = z.object({
  events: z.array(ingestEventSchema).min(1).max(500),
});

export const goalSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  type: z.enum(["LEARN_TOPIC", "CATEGORY_TIME", "LIMIT_CATEGORY", "DEEP_WORK"]),
  period: z.enum(["DAILY", "WEEKLY"]).default("DAILY"),
  direction: z.enum(["AT_LEAST", "AT_MOST"]).default("AT_LEAST"),
  targetCategory: z
    .enum([
      "Work",
      "Learning",
      "Development",
      "Research",
      "Documentation",
      "Communication",
      "News",
      "Entertainment",
      "SocialMedia",
      "Shopping",
      "Uncategorized",
    ])
    .optional(),
  keywords: z.array(z.string().max(40)).max(10).default([]),
  targetSeconds: z.number().int().min(60).max(24 * 3600),
});

export type IngestEvent = z.infer<typeof ingestEventSchema>;
export type GoalInput = z.infer<typeof goalSchema>;
