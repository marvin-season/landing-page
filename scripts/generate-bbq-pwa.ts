import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import type { MetadataRoute } from "next";

// Use Next's existing image dependency; no extra runtime package is needed.
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve("next"))("sharp");
const output = new URL("../public/bbq-pwa/", import.meta.url);
const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#b9443d"/>
  <path d="M164 122h184v268l-31-18-30 18-31-18-31 18-30-18-31 18Z" fill="#fff7ed"/>
  <path d="M207 185h98M207 232h98M207 279h52" fill="none" stroke="#b9443d" stroke-width="18" stroke-linecap="round"/>
  <circle cx="307" cy="310" r="39" fill="#f4bd59"/>
  <path d="m291 310 11 11 22-23" fill="none" stroke="#693127" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

async function main() {
  await mkdir(output, { recursive: true });
  await writeFile(new URL("icon.svg", output), `${icon}\n`);
  await Promise.all(
    [192, 512, 180].map((size) =>
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

  const manifest: MetadataRoute.Manifest = {
    // A stable app identity, separate from the personal site's PWA.
    id: "/admin/bbq",
    name: "天天记账",
    short_name: "天天记账",
    description: "个人支出、日常记账、菜单管理与饮食热量统计",
    lang: "zh-CN",
    start_url: "/zh/admin/bbq",
    scope: "/zh/admin/bbq",
    display: "standalone",
    background_color: "#f6f3ed",
    theme_color: "#b9443d",
    icons: [
      {
        src: "/bbq-pwa/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/bbq-pwa/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/bbq-pwa/icon-512.png",
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
