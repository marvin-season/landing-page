import { createHash } from "node:crypto";
import { mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { injectManifest } from "@serwist/build";
import { build } from "esbuild";

const root = process.cwd();
const buildId = (await readFile(path.join(root, ".next/BUILD_ID"), "utf8")).trim();
const output = path.join(root, "public/bbq-pwa/sw.js");
const bundled = path.join(root, ".next/bookkeeping-worker.js");
const publicAssets = [];

for (const directory of ["bbq-pwa", "bbq/companions"]) {
  for (const file of await readdir(path.join(root, "public", directory))) {
    const needed =
      directory === "bbq/companions"
        ? file.endsWith("-still.png")
        : /^(?:icon-[\w-]+\.png|apple-touch-icon\.png|manifest\.webmanifest)$/.test(file);
    if (!needed) continue;
    const bytes = await readFile(path.join(root, "public", directory, file));
    publicAssets.push({
      url: `/${directory}/${file}`,
      revision: createHash("sha256").update(bytes).digest("hex"),
    });
  }
}

await mkdir(path.dirname(output), { recursive: true });
await build({
  entryPoints: ["src/lib/bookkeeping-pwa/worker.ts"],
  outfile: bundled,
  bundle: true,
  // Keep the injection point's `self` identifier intact.
  minify: false,
  format: "iife",
  target: "es2020",
  define: {
    "process.env.NODE_ENV": '"production"',
    BOOKKEEPING_BUILD_ID: JSON.stringify(buildId),
  },
});

const result = await injectManifest({
  swSrc: bundled,
  swDest: output,
  globDirectory: ".next/static",
  // Include lazy chunks (statistics, calendar, backups) before claiming readiness.
  // No HTML/RSC, user data, APIs, source maps, or unrelated public assets.
  globPatterns: ["**/*.{js,css,woff,woff2,ttf,otf}"],
  modifyURLPrefix: { "": "/_next/static/" },
  additionalPrecacheEntries: publicAssets,
  maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
});
if (result.warnings.length) throw new Error(result.warnings.join("\n"));
console.log(`Bookkeeping offline: ${result.count} assets, ${(result.size / 1024 / 1024).toFixed(1)} MB of build assets.`);
