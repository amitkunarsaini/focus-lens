import type { Category, Productivity } from "@prisma/client";

/**
 * Activity classification engine.
 *
 * Maps a (domain, url, title) triple to a {@link Category}. This is the
 * deterministic core — it runs entirely without any AI API. The AI layer can
 * later refine ambiguous cases, but the platform is fully functional on rules
 * alone.
 *
 * NOTE: this module is imported by client components (charts, timeline, the
 * overrides manager). We therefore use string-literal constants rather than the
 * Prisma runtime enum objects — those are `undefined` in the browser bundle.
 */

/** Category string literals, typed against the Prisma enum. */
const C = {
  Work: "Work",
  Learning: "Learning",
  Development: "Development",
  Research: "Research",
  Documentation: "Documentation",
  Communication: "Communication",
  News: "News",
  Entertainment: "Entertainment",
  SocialMedia: "SocialMedia",
  Shopping: "Shopping",
  Uncategorized: "Uncategorized",
} as const satisfies Record<string, Category>;

/** Productivity-bucket string literals, typed against the Prisma enum. */
const P = {
  Productive: "Productive",
  Neutral: "Neutral",
  Distracting: "Distracting",
} as const satisfies Record<string, Productivity>;

export const CATEGORY_PRODUCTIVITY: Record<Category, Productivity> = {
  Development: P.Productive,
  Work: P.Productive,
  Learning: P.Productive,
  Research: P.Productive,
  Documentation: P.Productive,
  Communication: P.Neutral,
  News: P.Neutral,
  Shopping: P.Neutral,
  Entertainment: P.Distracting,
  SocialMedia: P.Distracting,
  Uncategorized: P.Neutral,
};

/** Visual identity per category — consumed by the dashboard. */
export const CATEGORY_META: Record<
  Category,
  { label: string; color: string; emoji: string }
> = {
  Development: { label: "Development", color: "#8b5cf6", emoji: "💻" },
  Work: { label: "Work", color: "#6366f1", emoji: "🗂️" },
  Learning: { label: "Learning", color: "#06b6d4", emoji: "📚" },
  Research: { label: "Research", color: "#14b8a6", emoji: "🔬" },
  Documentation: { label: "Documentation", color: "#0ea5e9", emoji: "📖" },
  Communication: { label: "Communication", color: "#22c55e", emoji: "✉️" },
  News: { label: "News", color: "#eab308", emoji: "📰" },
  Shopping: { label: "Shopping", color: "#f97316", emoji: "🛒" },
  Entertainment: { label: "Entertainment", color: "#ec4899", emoji: "🎬" },
  SocialMedia: { label: "Social Media", color: "#ef4444", emoji: "📱" },
  Uncategorized: { label: "Uncategorized", color: "#64748b", emoji: "❔" },
};

/** Exact / suffix domain → category map. Most specific wins. */
const DOMAIN_RULES: Array<[string, Category]> = [
  // Development
  ["github.com", C.Development],
  ["gitlab.com", C.Development],
  ["bitbucket.org", C.Development],
  ["vercel.com", C.Development],
  ["netlify.com", C.Development],
  ["codesandbox.io", C.Development],
  ["codepen.io", C.Development],
  ["replit.com", C.Development],
  ["npmjs.com", C.Development],
  ["jsfiddle.net", C.Development],
  ["localhost", C.Development],
  // Documentation
  ["developer.mozilla.org", C.Documentation],
  ["docs.python.org", C.Documentation],
  ["nextjs.org", C.Documentation],
  ["react.dev", C.Documentation],
  ["reactjs.org", C.Documentation],
  ["prisma.io", C.Documentation],
  ["tailwindcss.com", C.Documentation],
  ["docs.aws.amazon.com", C.Documentation],
  ["readthedocs.io", C.Documentation],
  ["devdocs.io", C.Documentation],
  // Learning
  ["stackoverflow.com", C.Learning],
  ["stackexchange.com", C.Learning],
  ["coursera.org", C.Learning],
  ["udemy.com", C.Learning],
  ["khanacademy.org", C.Learning],
  ["freecodecamp.org", C.Learning],
  ["leetcode.com", C.Learning],
  ["kaggle.com", C.Learning],
  ["edx.org", C.Learning],
  ["medium.com", C.Learning],
  ["dev.to", C.Learning],
  // AI assistants (general-purpose knowledge/ideation → Research)
  ["chatgpt.com", C.Research],
  ["chat.openai.com", C.Research],
  ["claude.ai", C.Research],
  ["gemini.google.com", C.Research],
  ["bard.google.com", C.Research],
  ["perplexity.ai", C.Research],
  ["copilot.microsoft.com", C.Research],
  ["poe.com", C.Research],
  ["you.com", C.Research],
  ["huggingface.co", C.Development],
  // Research
  ["arxiv.org", C.Research],
  ["scholar.google.com", C.Research],
  ["wikipedia.org", C.Research],
  ["researchgate.net", C.Research],
  ["semanticscholar.org", C.Research],
  // Work / productivity suites
  ["docs.google.com", C.Work],
  ["sheets.google.com", C.Work],
  ["drive.google.com", C.Work],
  ["notion.so", C.Work],
  ["linear.app", C.Work],
  ["atlassian.net", C.Work],
  ["jira.com", C.Work],
  ["trello.com", C.Work],
  ["asana.com", C.Work],
  ["figma.com", C.Work],
  ["calendar.google.com", C.Work],
  // Communication
  ["mail.google.com", C.Communication],
  ["outlook.com", C.Communication],
  ["outlook.office.com", C.Communication],
  ["slack.com", C.Communication],
  ["web.whatsapp.com", C.Communication],
  ["discord.com", C.Communication],
  ["teams.microsoft.com", C.Communication],
  ["meet.google.com", C.Communication],
  ["zoom.us", C.Communication],
  // News
  ["news.ycombinator.com", C.News],
  ["nytimes.com", C.News],
  ["bbc.com", C.News],
  ["theverge.com", C.News],
  ["techcrunch.com", C.News],
  ["bloomberg.com", C.News],
  ["reuters.com", C.News],
  // Social media
  ["twitter.com", C.SocialMedia],
  ["x.com", C.SocialMedia],
  ["linkedin.com", C.SocialMedia],
  ["facebook.com", C.SocialMedia],
  ["instagram.com", C.SocialMedia],
  ["reddit.com", C.SocialMedia],
  ["tiktok.com", C.SocialMedia],
  ["threads.net", C.SocialMedia],
  ["snapchat.com", C.SocialMedia],
  // Shopping
  ["amazon.com", C.Shopping],
  ["amazon.in", C.Shopping],
  ["flipkart.com", C.Shopping],
  ["ebay.com", C.Shopping],
  ["etsy.com", C.Shopping],
  ["myntra.com", C.Shopping],
  // Entertainment
  ["netflix.com", C.Entertainment],
  ["primevideo.com", C.Entertainment],
  ["hotstar.com", C.Entertainment],
  ["spotify.com", C.Entertainment],
  ["twitch.tv", C.Entertainment],
  ["9gag.com", C.Entertainment],
];

/** Title keyword hints, applied when the domain alone is ambiguous. */
const TITLE_LEARNING_HINTS = [
  "tutorial",
  "how to",
  "guide",
  "course",
  "lecture",
  "explained",
  "crash course",
  "documentation",
  "learn",
];
const TITLE_ENTERTAINMENT_HINTS = [
  "shorts",
  "funny",
  "meme",
  "reaction",
  "trailer",
  "music video",
  "vlog",
  "highlights",
];

export function normalizeDomain(input: string): string {
  let host = input;
  try {
    host = new URL(input.includes("://") ? input : `https://${input}`).hostname;
  } catch {
    /* already a hostname or garbage */
  }
  return host.replace(/^www\./, "").toLowerCase();
}

function matchDomain(domain: string): Category | null {
  for (const [pattern, category] of DOMAIN_RULES) {
    if (domain === pattern || domain.endsWith(`.${pattern}`)) return category;
  }
  return null;
}

/**
 * YouTube is the canonical "context-dependent" domain: a tutorial is Learning,
 * a short is Entertainment. We disambiguate from the URL + title.
 */
function classifyYouTube(url: string, title: string): Category {
  const t = title.toLowerCase();
  if (url.includes("/shorts/")) return C.Entertainment;
  if (TITLE_ENTERTAINMENT_HINTS.some((h) => t.includes(h)))
    return C.Entertainment;
  if (TITLE_LEARNING_HINTS.some((h) => t.includes(h))) return C.Learning;
  return C.Entertainment; // default leisure unless signalled otherwise
}

export interface ClassifyInput {
  url: string;
  title?: string | null;
  domain?: string | null;
}

export function classify({ url, title, domain }: ClassifyInput): Category {
  const host = normalizeDomain(domain || url);
  const safeTitle = title ?? "";

  if (host === "youtube.com" || host.endsWith(".youtube.com"))
    return classifyYouTube(url, safeTitle);

  const direct = matchDomain(host);
  if (direct) return direct;

  // Fall back to title keyword hints.
  const t = safeTitle.toLowerCase();
  if (TITLE_LEARNING_HINTS.some((h) => t.includes(h))) return C.Learning;

  return C.Uncategorized;
}

export function productivityOf(category: Category): Productivity {
  return CATEGORY_PRODUCTIVITY[category];
}
