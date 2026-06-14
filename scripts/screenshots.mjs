/**
 * Captures real dashboard screenshots into docs/screenshots/.
 * Requires the dev server running on http://localhost:3000 and the demo user.
 * Run: node scripts/screenshots.mjs
 */
import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "docs/screenshots");
mkdirSync(outDir, { recursive: true });

const BASE = "http://localhost:3000";
const EMAIL = "demo@focuslens.app";
const PASSWORD = "demo1234";

const PAGES = [
  { route: "/dashboard", name: "overview" },
  { route: "/analytics", name: "analytics" },
  { route: "/timeline", name: "timeline" },
  { route: "/focus", name: "focus" },
  { route: "/insights", name: "insights" },
  { route: "/goals", name: "goals" },
];

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: "dark",
  });
  const page = await context.newPage();

  // ── sign in ──
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await Promise.all([
    page.waitForURL("**/dashboard", { timeout: 30000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForTimeout(1500);

  for (const p of PAGES) {
    await page.goto(`${BASE}${p.route}`, { waitUntil: "networkidle" });
    // let Framer Motion entrances + Recharts mounts settle
    await page.waitForTimeout(2200);
    const file = resolve(outDir, `${p.name}.png`);
    await page.screenshot({ path: file });
    console.log(`captured ${p.name} → ${file}`);
  }

  // Top Websites by time is below the fold on Analytics — capture it directly.
  await page.goto(`${BASE}/analytics`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const websites = page.locator("text=Top websites by time").first();
  await websites.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: resolve(outDir, "analytics-websites.png") });
  console.log("captured analytics-websites");

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
