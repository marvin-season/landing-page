import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import type { MetadataRoute } from "next";

// Use Next's existing image dependency; no extra runtime package is needed.
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve("next"))("sharp");
const output = new URL("../public/bbq-pwa/", import.meta.url);
const iconVersion = "luji-1";

// Original notebook mark; no character artwork is shipped with the application.
function iconSvg(inset: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#fff5f7"/>
  <g transform="translate(${inset} ${inset}) scale(${(512 - inset * 2) / 512})">
    <rect x="100" y="60" width="320" height="392" rx="52" fill="#c75d80"/>
    <path d="M172 60v392" stroke="#f5b3c8" stroke-width="16"/>
    <path d="M232 168v152h116" fill="none" stroke="#fff5f7" stroke-width="32" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M284 74c-34 47-48 67-48 88a48 48 0 0 0 96 0c0-21-14-41-48-88Z" fill="#fff5f7" transform="translate(120 40) scale(.48)"/>
  </g>
</svg>`;
}

async function main() {
  await mkdir(output, { recursive: true });
  const icon = iconSvg(20);
  await writeFile(new URL("icon.svg", output), `${icon}\n`);
  await Promise.all(
    [16, 32, 192, 512, 180].map((size) =>
      sharp(Buffer.from(icon))
        .resize(size, size)
        .png()
        .toFile(
          new URL(
            size === 180 ? "apple-touch-icon.png" : `icon-${size}.png`,
            output,
          ).pathname,
        ),
    ),
  );
  // Keep the notebook inside the maskable safe area.
  await sharp(Buffer.from(iconSvg(70)))
    .resize(512, 512)
    .png()
    .toFile(new URL("icon-maskable-512.png", output).pathname);

  const manifest: MetadataRoute.Manifest = {
    id: "/bookkeeping",
    name: "记露",
    short_name: "记露",
    description: "记录日常支出与饮食热量，收藏常用项目，保存照片与账本备份。",
    lang: "zh-CN",
    start_url: "/zh/bookkeeping",
    scope: "/zh/bookkeeping",
    display: "standalone",
    background_color: "#fff5f7",
    theme_color: "#fff5f7",
    icons: [
      {
        src: `/bbq-pwa/icon-192.png?v=${iconVersion}`,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `/bbq-pwa/icon-512.png?v=${iconVersion}`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `/bbq-pwa/icon-maskable-512.png?v=${iconVersion}`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
  await writeFile(
    new URL("manifest.webmanifest", output),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
}

void main();
