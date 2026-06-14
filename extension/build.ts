/**
 * Builds the FocusLens extension into extension/dist/.
 * Run with: npm run ext:build  (or: npx tsx extension/build.ts --watch)
 */
import { build, context } from "esbuild";
import { cpSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const outdir = resolve(root, "dist");
const watch = process.argv.includes("--watch");

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
  cpSync(resolve(root, "manifest.json"), resolve(outdir, "manifest.json"));
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
