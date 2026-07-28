/**
 * Copy MapLibre GL worker assets into public/ so setWorkerUrl can load them
 * from a same-origin path under Next.js bundlers (Turbopack / webpack).
 *
 * Worker + shared must live next to each other: the worker imports
 * ./maplibre-gl-shared.mjs relatively.
 */
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(dirname(require.resolve("maplibre-gl/package.json")), "dist");
const outDir = join(root, "public", "maplibre");

const files = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];

mkdirSync(outDir, { recursive: true });

for (const file of files) {
  const src = join(dist, file);
  if (!existsSync(src)) {
    throw new Error(`Missing MapLibre asset: ${src}`);
  }
  copyFileSync(src, join(outDir, file));
}

console.log(`Synced MapLibre worker assets → public/maplibre/ (${files.join(", ")})`);
