import { Category } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { classify, normalizeDomain, type ClassifyInput } from "@/lib/classify";
import { recomputeDay } from "@/lib/analytics/persist";
import { startOfDay, dayKey } from "@/lib/utils";

/**
 * User category overrides.
 *
 * Overrides sit on top of the rule-based classifier: if the user has pinned a
 * domain to a category, that wins; otherwise the deterministic classifier runs.
 */

export type OverrideMap = Record<string, Category>;

export async function getOverrideMap(userId: string): Promise<OverrideMap> {
  const rows = await prisma.categoryOverride.findMany({ where: { userId } });
  return Object.fromEntries(rows.map((r) => [r.domain, r.category]));
}

/** Classify with the user's overrides applied first. */
export function resolveCategory(input: ClassifyInput, overrides: OverrideMap): Category {
  const host = normalizeDomain(input.domain || input.url);
  return overrides[host] ?? classify(input);
}

/**
 * Re-classify every stored event on a domain (after an override is added or
 * removed) and recompute the analytics for each affected day. Idempotent.
 */
export async function reclassifyDomain(userId: string, domain: string): Promise<number> {
  const host = normalizeDomain(domain);
  const overrides = await getOverrideMap(userId);

  const events = await prisma.browsingEvent.findMany({
    where: { userId, domain: host },
    select: { id: true, url: true, title: true, domain: true, startTime: true },
  });
  if (events.length === 0) return 0;

  // Group event ids by their freshly-resolved category, then bulk-update.
  const byCategory = new Map<Category, string[]>();
  const days = new Map<string, Date>();
  for (const e of events) {
    const cat = resolveCategory(
      { url: e.url, title: e.title, domain: e.domain },
      overrides,
    );
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(e.id);
    const key = dayKey(e.startTime);
    if (!days.has(key)) days.set(key, startOfDay(e.startTime));
  }

  for (const [category, ids] of byCategory) {
    await prisma.browsingEvent.updateMany({
      where: { id: { in: ids } },
      data: { category },
    });
  }

  for (const day of days.values()) {
    await recomputeDay(userId, day);
  }
  return events.length;
}
