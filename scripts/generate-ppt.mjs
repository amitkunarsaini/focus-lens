/**
 * Generates docs/FocusLens-Showcase.pptx — a feature showcase deck.
 * Run: node scripts/generate-ppt.mjs
 */
import pptxgen from "pptxgenjs";
import { mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
mkdirSync(resolve(root, "docs"), { recursive: true });
const shot = (name) => resolve(root, "docs/screenshots", name);

// ── theme ────────────────────────────────────────────────────────────────
const C = {
  bg: "0C0E14",
  card: "161925",
  border: "2A2F40",
  fg: "E8EAF0",
  muted: "9AA0B4",
  violet: "8B5CF6",
  cyan: "22D3EE",
  emerald: "34D399",
  amber: "FBBF24",
  rose: "F87171",
  white: "FFFFFF",
};
const FONT = "Aptos";
const W = 13.333;
const H = 7.5;

const pptx = new pptxgen();
pptx.defineLayout({ name: "WIDE", width: W, height: H });
pptx.layout = "WIDE";
pptx.author = "FocusLens";
pptx.company = "FocusLens";
pptx.title = "FocusLens — Attention Intelligence Platform";

let pageNo = 0;
function base(opts = {}) {
  const slide = pptx.addSlide();
  slide.background = { color: opts.bg || C.bg };
  return slide;
}

function chrome(slide, kicker) {
  // top accent bar
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.12, fill: { color: C.violet } });
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W / 2, h: 0.12, fill: { color: C.cyan } });
  // footer
  pageNo += 1;
  slide.addText("FocusLens — Attention Intelligence Platform", {
    x: 0.5, y: H - 0.45, w: 9, h: 0.3, fontFace: FONT, fontSize: 9, color: C.muted, align: "left",
  });
  slide.addText(String(pageNo), {
    x: W - 1, y: H - 0.45, w: 0.5, h: 0.3, fontFace: FONT, fontSize: 9, color: C.muted, align: "right",
  });
  if (kicker) {
    slide.addText(kicker.toUpperCase(), {
      x: 0.5, y: 0.45, w: 12, h: 0.3, fontFace: FONT, fontSize: 12, color: C.cyan, bold: true, charSpacing: 2,
    });
  }
}

function heading(slide, title, y = 0.8) {
  slide.addText(title, {
    x: 0.5, y, w: 12.3, h: 0.8, fontFace: FONT, fontSize: 30, color: C.fg, bold: true,
  });
}

/** A grid of feature cards. items: [{title, body, color}] */
function cards(slide, items, { cols = 2, top = 1.9, gap = 0.3, cardH } = {}) {
  const totalGap = gap * (cols - 1);
  const cardW = (12.33 - totalGap) / cols;
  const rows = Math.ceil(items.length / cols);
  const h = cardH || Math.min(2.0, (H - top - 0.7) / rows - gap);
  items.forEach((it, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const x = 0.5 + c * (cardW + gap);
    const y = top + r * (h + gap);
    slide.addShape(pptx.ShapeType.roundRect, {
      x, y, w: cardW, h, rectRadius: 0.08,
      fill: { color: C.card }, line: { color: it.color || C.border, width: 1 },
    });
    slide.addShape(pptx.ShapeType.rect, { x, y, w: 0.08, h, fill: { color: it.color || C.violet } });
    slide.addText(
      [
        { text: it.title, options: { fontSize: 15, bold: true, color: C.fg, breakLine: true } },
        { text: it.body, options: { fontSize: 11.5, color: C.muted } },
      ],
      { x: x + 0.25, y: y + 0.12, w: cardW - 0.45, h: h - 0.24, fontFace: FONT, valign: "top", lineSpacingMultiple: 1.05 },
    );
  });
}

function bullets(slide, lines, { x = 0.6, y = 1.9, w = 12.2, h = 4.6, fontSize = 16 } = {}) {
  slide.addText(
    lines.map((t) => ({
      text: typeof t === "string" ? t : t.text,
      options: { bullet: { code: "2022", indent: 18 }, color: (t.color) || C.fg, bold: !!t.bold, breakLine: true, paraSpaceAfter: 8 },
    })),
    { x, y, w, h, fontFace: FONT, fontSize, color: C.fg, valign: "top" },
  );
}

/** A slide showcasing a real screenshot with a framed image + caption. */
function shotSlide(kicker, title, caption, imageName, accent = C.violet) {
  const s = base();
  chrome(s, kicker);
  heading(s, title);
  s.addText(caption, {
    x: 0.5, y: 1.55, w: 12.3, h: 0.5, fontFace: FONT, fontSize: 14, color: C.muted,
  });
  // 1440×900 screenshots → 1.6 aspect. Height-constrained to fit below the title.
  const h = 5.25;
  const w = h * 1.6;
  const x = (W - w) / 2;
  const y = 2.05;
  if (existsSync(shot(imageName))) {
    s.addShape(pptx.ShapeType.roundRect, {
      x: x - 0.06, y: y - 0.06, w: w + 0.12, h: h + 0.12, rectRadius: 0.06,
      fill: { color: C.card }, line: { color: accent, width: 1.5 },
    });
    s.addImage({ path: shot(imageName), x, y, w, h });
  } else {
    s.addText(`(screenshot ${imageName} not found — run: node scripts/screenshots.mjs)`, {
      x, y, w, h, align: "center", valign: "middle", color: C.muted, fontFace: FONT, fontSize: 14,
    });
  }
  return s;
}

function stat(slide, x, y, value, label, color) {
  slide.addText(value, { x, y, w: 2.7, h: 0.7, fontFace: FONT, fontSize: 30, bold: true, color: color || C.cyan, align: "center" });
  slide.addText(label, { x, y: y + 0.7, w: 2.7, h: 0.5, fontFace: FONT, fontSize: 11, color: C.muted, align: "center" });
}

// ── 1. Title ────────────────────────────────────────────────────────────
{
  const s = base();
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.16, fill: { color: C.violet } });
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W / 2, h: 0.16, fill: { color: C.cyan } });
  // logo mark
  s.addShape(pptx.ShapeType.roundRect, { x: 0.9, y: 2.35, w: 1.0, h: 1.0, rectRadius: 0.18, fill: { color: C.card }, line: { color: C.violet, width: 1.5 } });
  s.addShape(pptx.ShapeType.ellipse, { x: 1.12, y: 2.57, w: 0.56, h: 0.56, fill: { color: C.card }, line: { color: C.cyan, width: 3 } });
  s.addShape(pptx.ShapeType.ellipse, { x: 1.31, y: 2.76, w: 0.18, h: 0.18, fill: { color: C.violet } });

  s.addText("FocusLens", { x: 2.1, y: 2.3, w: 10, h: 0.9, fontFace: FONT, fontSize: 50, bold: true, color: C.white });
  s.addText("Attention Intelligence Platform", { x: 2.12, y: 3.15, w: 10, h: 0.6, fontFace: FONT, fontSize: 22, color: C.cyan });
  s.addText(
    "Understand where your attention goes, why you get distracted, and how to improve — from real behavioural data.",
    { x: 0.9, y: 4.2, w: 11, h: 1, fontFace: FONT, fontSize: 16, color: C.muted },
  );
  s.addText("Chrome Extension (MV3)   •   Next.js 16 Dashboard   •   Prisma / PostgreSQL   •   Deterministic engine + optional AI", {
    x: 0.9, y: 6.3, w: 11.5, h: 0.4, fontFace: FONT, fontSize: 12, color: C.muted, bold: true,
  });
}

// ── 2. The shift ───────────────────────────────────────────────────────────
{
  const s = base(); chrome(s, "Vision");
  heading(s, "Not another screen-time tracker");
  cards(s, [
    { title: "Typical trackers tell you…", body: "• Time spent per website\n• A daily usage bar chart\n\nRaw numbers. No meaning.", color: C.rose },
    { title: "FocusLens tells you…", body: "• When you do your best deep work\n• What breaks your focus and its real cost\n• Whether your time matches your goals\n• How your patterns change over time", color: C.emerald },
  ], { cols: 2, top: 1.9, cardH: 2.6 });
  s.addText(
    "It answers questions like: “Why was I distracted today?”, “When am I most productive?”, “Which sites break my focus?”, “Am I actually working toward my goals?”",
    { x: 0.6, y: 4.8, w: 12.1, h: 1.2, fontFace: FONT, fontSize: 15, italic: true, color: C.fg, align: "center" },
  );
}

// ── 3. Architecture ─────────────────────────────────────────────────────────
{
  const s = base(); chrome(s, "Architecture");
  heading(s, "How it works");
  const boxes = [
    { t: "Chrome Extension", d: "Captures active-attention spans (tab, URL, title, time) and streams them every ~60s.", col: C.cyan },
    { t: "Ingest API", d: "Authenticated by a per-user token; classifies & stores each event.", col: C.violet },
    { t: "Intelligence Engine", d: "Deterministic: focus, leaks, switching, scoring, goals.", col: C.emerald },
    { t: "PostgreSQL", d: "Stores only real data. Dashboard reads precomputed rollups.", col: C.amber },
  ];
  const w = 2.85, gap = 0.32, y = 2.5, h = 1.7;
  boxes.forEach((b, i) => {
    const x = 0.5 + i * (w + gap);
    s.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.08, fill: { color: C.card }, line: { color: b.col, width: 1.25 } });
    s.addText([
      { text: b.t, options: { fontSize: 14, bold: true, color: C.fg, breakLine: true } },
      { text: b.d, options: { fontSize: 10.5, color: C.muted } },
    ], { x: x + 0.18, y: y + 0.15, w: w - 0.36, h: h - 0.3, fontFace: FONT, valign: "top" });
    if (i < boxes.length - 1) {
      s.addText("→", { x: x + w - 0.02, y: y + h / 2 - 0.25, w: gap + 0.04, h: 0.5, fontFace: FONT, fontSize: 20, color: C.muted, align: "center" });
    }
  });
  s.addText("AI layer (Claude) is optional — it only rephrases the daily summary. Every metric is computed deterministically, so the product works fully with no API key.", {
    x: 0.6, y: 4.7, w: 12.1, h: 1, fontFace: FONT, fontSize: 14, color: C.cyan, align: "center", italic: true,
  });
  s.addText("Live pipeline:  BrowsingEvent → recomputeDay() → FocusSessions · AttentionLeaks · DailyAnalytics · ProductivityScore · Insights", {
    x: 0.6, y: 5.7, w: 12.1, h: 0.5, fontFace: FONT, fontSize: 12, color: C.muted, align: "center" });
}

// ── 4. Tech stack ───────────────────────────────────────────────────────────
{
  const s = base(); chrome(s, "Stack");
  heading(s, "Built like a modern SaaS product");
  cards(s, [
    { title: "Frontend", body: "Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn-style UI, Framer Motion, TanStack Query, Recharts.", color: C.violet },
    { title: "Backend", body: "Next.js API Routes, Prisma ORM, PostgreSQL. NextAuth (credentials + Google) with JWT sessions.", color: C.cyan },
    { title: "Extension", body: "Chrome Manifest V3 service worker, TypeScript, esbuild bundling, durable chrome.storage state.", color: C.emerald },
    { title: "AI (optional)", body: "Anthropic Claude via @anthropic-ai/sdk — enhances narratives, with a deterministic fallback.", color: C.amber },
  ], { cols: 2, top: 1.9, cardH: 2.05 });
}

// ── 5. Extension ────────────────────────────────────────────────────────────
{
  const s = base(); chrome(s, "Real-time capture");
  heading(s, "Chrome extension — real activity, automatically");
  bullets(s, [
    { text: "Tracks one active-attention span per focused, non-idle tab — no manual start/stop.", bold: true },
    "Closes & queues a span on: tab switch, navigation, window focus/blur, idle (60s), tab close.",
    "Durable state in chrome.storage — survives the service worker being suspended by Chrome.",
    "Auto-flushes batches to the dashboard every ~60s (authenticated by a per-user ingest token); failed batches retry.",
    "Popup shows today's tracked time, events & queue; one-click sync; pause tracking anytime.",
  ], { y: 1.9, h: 3.0 });
  stat(s, 0.7, 5.2, "5+", "tracked events", C.cyan);
  stat(s, 3.7, 5.2, "~60s", "auto-sync", C.violet);
  stat(s, 6.7, 5.2, "0", "manual effort", C.emerald);
  stat(s, 9.7, 5.2, "MV3", "service worker", C.amber);
}

// ── 6. Classification ───────────────────────────────────────────────────────
{
  const s = base(); chrome(s, "Engine");
  heading(s, "Activity classification");
  s.addText("Every page maps to a category (rule-based, instant, no AI) → rolled up to Productive / Neutral / Distracting.", {
    x: 0.6, y: 1.65, w: 12.1, h: 0.5, fontFace: FONT, fontSize: 14, color: C.muted });
  cards(s, [
    { title: "10 categories", body: "Development, Work, Learning, Research, Documentation, Communication, News, Social Media, Shopping, Entertainment.", color: C.violet },
    { title: "Context-aware", body: "A YouTube tutorial → Learning; a YouTube Short → Entertainment. ChatGPT/Claude → Research.", color: C.cyan },
    { title: "Examples", body: "github.com → Development · stackoverflow → Learning · MDN → Documentation · linkedin → Social.", color: C.emerald },
    { title: "Your overrides", body: "Pin any domain to a category. Applied retroactively — past activity re-classified & analytics recomputed.", color: C.amber },
  ], { cols: 2, top: 2.3, cardH: 1.95 });
}

// ── 7. Focus sessions ───────────────────────────────────────────────────────
{
  const s = base(); chrome(s, "Feature");
  heading(s, "Focus session detection");
  bullets(s, [
    { text: "Automatically detects sustained deep-work runs (≥ 15 min), tolerating short interruptions.", bold: true },
    "Sessions ≥ 45 min are flagged as deep work.",
    "Each session: start/end, duration, primary activity, interruption count, and a quality score (0–100).",
    "“Best focus periods” surface the hours of day you most reliably do deep work — protect them.",
  ], { y: 1.9, h: 2.6 });
  stat(s, 1.2, 4.9, "≥15m", "session", C.cyan);
  stat(s, 4.5, 4.9, "≥45m", "deep work", C.violet);
  stat(s, 7.8, 4.9, "0–100", "quality score", C.emerald);
}

// ── 8. Attention leaks ──────────────────────────────────────────────────────
{
  const s = base(); chrome(s, "Feature");
  heading(s, "Attention leak detection");
  bullets(s, [
    { text: "Finds productive runs repeatedly broken by distracting detours — the classic GitHub → WhatsApp → LinkedIn → GitHub pattern.", bold: true },
    "Reports interruption count, time lost to detours, and an estimated focus-recovery cost.",
    "Surfaces the specific domains that most often break your flow.",
  ], { y: 1.9, h: 2.2 });
  s.addText("“Your coding session was interrupted 4 times. Estimated focus-recovery loss: 17 minutes.”", {
    x: 1.0, y: 4.5, w: 11.3, h: 1, fontFace: FONT, fontSize: 18, italic: true, color: C.rose, align: "center",
  });
}

// ── 9. Scoring + switching ──────────────────────────────────────────────────
{
  const s = base(); chrome(s, "Engine");
  heading(s, "Explainable productivity score");
  s.addText("A single 0–100 score, built from five weighted components — every point is traceable to real behaviour.", {
    x: 0.6, y: 1.65, w: 12.1, h: 0.5, fontFace: FONT, fontSize: 14, color: C.muted });
  cards(s, [
    { title: "Category mix · 40", body: "Share of active time on productive categories (distractions drag it down).", color: C.violet },
    { title: "Deep focus · 25", body: "Credit for sustained deep-work time.", color: C.cyan },
    { title: "Sustained attention · 20", body: "Inverse of context-switching frequency per active hour.", color: C.emerald },
    { title: "Engagement · 5", body: "Staying active rather than idle.", color: C.amber },
    { title: "Goal alignment · 10", body: "How well the day matched your declared goals.", color: C.rose },
    { title: "Context switching", body: "Tracked separately as its own 0–100 score + daily/weekly trend.", color: C.cyan },
  ], { cols: 3, top: 2.3, cardH: 1.9 });
}

// ── 10. Goals ───────────────────────────────────────────────────────────────
{
  const s = base(); chrome(s, "Feature");
  heading(s, "Goal alignment");
  bullets(s, [
    { text: "Define what matters: learn a topic, hit deep-work hours, or limit a category.", bold: true },
    "Actual behaviour is measured against each goal → progress % + an alignment score.",
    "Supports both directions: “at least 2h learning AI” and “at most 1h social media”.",
    "Goal alignment feeds back into the productivity score.",
  ], { y: 1.9, h: 2.4 });
  cards(s, [
    { title: "Learn AI · 42m / 2h", body: "35% — behind", color: C.amber },
    { title: "Deep work · 3h 20m / 4h", body: "83% — almost", color: C.cyan },
    { title: "Social ≤ 1h · 38m used", body: "On track", color: C.emerald },
  ], { cols: 3, top: 4.6, cardH: 1.4 });
}

// ── 11. Daily + weekly intelligence ──────────────────────────────────────────
{
  const s = base(); chrome(s, "Intelligence");
  heading(s, "Daily & weekly intelligence");
  cards(s, [
    { title: "Daily summary", body: "“Today you spent 7.2h online, 4.8h productive. Your highest focus was 10:15–11:48 AM. Most distractions came from social media. Productivity +11% vs yesterday.”", color: C.violet },
    { title: "Weekly report", body: "Productivity & focus trends, top productive sites vs. top distractions, learning & deep-work hours, and actionable recommendations.", color: C.cyan },
    { title: "Patterns & risks", body: "“You're sharpest around 10 AM.” · “High context switching detected — batch tasks and mute chat.”", color: C.emerald },
    { title: "Generated from data", body: "Narratives are built from measured numbers; the optional AI layer only rephrases — it never invents figures.", color: C.amber },
  ], { cols: 2, top: 1.9, cardH: 2.15 });
}

// ── 12. Dashboard tour ───────────────────────────────────────────────────────
{
  const s = base(); chrome(s, "Dashboard");
  heading(s, "Six dashboard views");
  cards(s, [
    { title: "Overview", body: "Score ring, focus time, deep work, goal alignment, attention leaks, daily summary.", color: C.violet },
    { title: "Timeline", body: "Minute-by-minute attention (newest first) with focus blocks & interruptions inline.", color: C.cyan },
    { title: "Analytics", body: "Trends, category donut, hourly heat, context-switching, and Top Websites by time.", color: C.emerald },
    { title: "Focus Sessions", body: "All deep-work blocks, longest session, best focus periods.", color: C.amber },
    { title: "Insights", body: "Weekly report + behavioural patterns, risks and recommendations.", color: C.rose },
    { title: "Goals", body: "Create/manage goals; live progress and alignment.", color: C.violet },
  ], { cols: 3, top: 1.9, cardH: 1.95 });
}

// ── Product tour — real screenshots ──────────────────────────────────────────
shotSlide("Product tour", "Overview", "Productivity score, focus time, deep work, goal alignment, attention leaks and the daily intelligence summary.", "overview.png", C.violet);
shotSlide("Product tour", "Analytics", "Productivity & focus trends, average-day hourly distribution, category breakdown and context-switching.", "analytics.png", C.cyan);
shotSlide("Product tour", "Timeline", "A minute-by-minute view of the day's attention — newest first — with focus blocks and interruptions inline.", "timeline.png", C.emerald);
shotSlide("Product tour", "Focus Sessions", "Every detected deep-work block, longest session, average quality and your best focus periods.", "focus.png", C.amber);
shotSlide("Product tour", "Insights", "The Weekly Intelligence Report plus behavioural patterns, risks and recommendations.", "insights.png", C.rose);
shotSlide("Product tour", "Goals", "Define goals and watch real behaviour measured against them in real time.", "goals.png", C.violet);

// ── 13. Top websites (real screenshot) ───────────────────────────────────────
shotSlide(
  "Highlight",
  "“Where did my time go?”",
  "Top Websites by time — every site ranked by exact time + % of total, colour-coded by category, with a 7/30-day toggle.",
  "analytics-websites.png",
  C.emerald,
);

// ── 14. Live vs Demo ─────────────────────────────────────────────────────────
{
  const s = base(); chrome(s, "Modes");
  heading(s, "Live & Demo modes — fully isolated");
  cards(s, [
    { title: "Live Mode (default)", body: "Real attention data collected by the extension, stored in PostgreSQL.", color: C.emerald },
    { title: "Demo Mode", body: "30 days of realistic activity, generated in-memory through the same engine — instant, and never written to the database.", color: C.cyan },
  ], { cols: 2, top: 1.9, cardH: 1.7 });
  s.addText("Switching modes only flips a view — it is 100% non-destructive. Your real attention data is never touched or deleted.", {
    x: 0.6, y: 3.9, w: 12.1, h: 0.8, fontFace: FONT, fontSize: 16, bold: true, color: C.emerald, align: "center" });
  bullets(s, [
    "Privacy: events go only to your own server; tracking can be paused anytime.",
    "Resilient: all core analytics work with no AI API key configured.",
  ], { y: 4.9, h: 1.3, fontSize: 14 });
}

// ── 15. Closing ──────────────────────────────────────────────────────────────
{
  const s = base();
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.16, fill: { color: C.violet } });
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W / 2, h: 0.16, fill: { color: C.cyan } });
  s.addText("This isn't a screen-time tracker.", { x: 0.9, y: 2.6, w: 11.5, h: 0.8, fontFace: FONT, fontSize: 34, bold: true, color: C.white });
  s.addText("It's an intelligence system that understands how people spend attention, identifies focus patterns, predicts distractions, and helps improve productivity — using real behavioural data.", {
    x: 0.9, y: 3.5, w: 11.3, h: 1.6, fontFace: FONT, fontSize: 18, color: C.cyan });
  s.addText("FocusLens", { x: 0.9, y: 6.2, w: 6, h: 0.5, fontFace: FONT, fontSize: 16, bold: true, color: C.muted });
}

await pptx.writeFile({ fileName: resolve(root, "docs/FocusLens-Showcase.pptx") });
console.log("Wrote docs/FocusLens-Showcase.pptx (" + pageNo + " content slides + title/closing)");
