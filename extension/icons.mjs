/**
 * Generates the FocusLens extension PNG icons from an inline SVG using sharp.
 * Run automatically by extension/build.ts. Output → extension/src/icons/.
 */
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(root, "src/icons");
mkdirSync(outDir, { recursive: true });

const svg = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#8b5cf6"/>
      <stop offset="100%" stop-color="#22d3ee"/>
    </linearGradient>
  </defs>
  <rect x="6" y="6" width="116" height="116" rx="28" fill="#0c0e14"/>
  <rect x="6" y="6" width="116" height="116" rx="28" fill="none" stroke="url(#g)" stroke-width="4" opacity="0.6"/>
  <circle cx="64" cy="64" r="34" fill="none" stroke="url(#g)" stroke-width="9"/>
  <circle cx="64" cy="64" r="13" fill="url(#g)"/>
</svg>`;

const sizes = [16, 32, 48, 128];
await Promise.all(
  sizes.map((s) =>
    sharp(Buffer.from(svg(s)))
      .resize(s, s)
      .png()
      .toFile(resolve(outDir, `icon${s}.png`)),
  ),
);

console.log(`Generated icons: ${sizes.map((s) => `icon${s}.png`).join(", ")}`);
