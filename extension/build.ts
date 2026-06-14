/**
 * Builds the FocusLens extension into extension/dist/.
 * Run with: npm run ext:build  (or: npx tsx extension/build.ts --watch)
 */
import { build, context } from "esbuild";
import { cpSync, mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const outdir = resolve(root, "dist");
const watch = process.argv.includes("--watch");

/**
 * The dashboard the extension talks to. Build for production with:
 *   FOCUSLENS_DASHBOARD_URL=https://your-app.vercel.app npm run ext:build
 * This becomes the default in the extension's Settings AND scopes the
 * manifest's host_permissions to exactly that origin (+ localhost for dev).
 */
const DASHBOARD_URL = (process.env.FOCUSLENS_DASHBOARD_URL || "http://localhost:3000").replace(/\/$/, "");
const DASHBOARD_ORIGIN = new URL(DASHBOARD_URL).origin;

rmSync(outdir, { recursive: true, force: true });
mkdirSync(outdir, { recursive: true });

const entryPoints = {
  background: resolve(root, "src/background.ts"),
  popup: resolve(root, "src/popup.ts"),
  options: resolve(root, "src/options.ts"),
};

const buildOptions = {
  entryPoints,
  outdir,
  bundle: true,
  format: "esm" as const,
  target: "chrome114",
  logLevel: "info" as const,
  define: {
    __FL_DEFAULT_URL__: JSON.stringify(DASHBOARD_URL),
  },
};

function ensureIcons() {
  const iconsDir = resolve(root, "src/icons");
  if (!existsSync(resolve(iconsDir, "icon128.png"))) {
    try {
      execFileSync("node", [resolve(root, "icons.mjs")], { stdio: "inherit" });
    } catch {
      console.warn("Icon generation skipped (sharp unavailable); using manifest without icons is fine.");
    }
  }
  return existsSync(resolve(iconsDir, "icon128.png"));
}

function copyStatic() {
  // Template the manifest: scope host_permissions to the dashboard origin only
  // (the extension reads tab URLs/titles via the "tabs" permission, so it only
  // needs host access to POST events to the dashboard).
  const manifest = JSON.parse(readFileSync(resolve(root, "manifest.json"), "utf8"));
  delete manifest._comment_host_permissions;
  const hosts = new Set([`${DASHBOARD_ORIGIN}/*`, "http://localhost:3000/*"]);
  manifest.host_permissions = [...hosts];
  writeFileSync(resolve(outdir, "manifest.json"), JSON.stringify(manifest, null, 2));

  for (const f of ["popup.html", "popup.css", "options.html"]) {
    cpSync(resolve(root, "src", f), resolve(outdir, f));
  }
  if (ensureIcons()) {
    cpSync(resolve(root, "src/icons"), resolve(outdir, "icons"), { recursive: true });
  }
}

function packageZip() {
  try {
    execFileSync("zip", ["-r", "-q", resolve(root, "focuslens-extension.zip"), "."], {
      cwd: outdir,
    });
    console.log(`Packaged → extension/focuslens-extension.zip`);
  } catch {
    console.warn("zip packaging skipped (zip not available).");
  }
}

async function run() {
  console.log(`FocusLens extension → dashboard: ${DASHBOARD_URL}`);
  if (watch) {
    const ctx = await context(buildOptions);
    await ctx.watch();
    copyStatic();
    console.log("FocusLens extension watching… load extension/dist as unpacked.");
  } else {
    await build(buildOptions);
    copyStatic();
    packageZip();
    console.log(`FocusLens extension built → ${outdir}`);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
