import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import type { MetadataRoute } from "next";

// Use Next's existing image dependency; no extra runtime package is needed.
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve("next"))("sharp");
const output = new URL("../public/bbq-pwa/", import.meta.url);
const portrait = new URL("../public/bbq-pwa/loopy-source.png", import.meta.url);
const iconVersion = "loopy-2";

function iconSvg(portraitData: string, inset: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#f9dce5"/>
  <circle cx="256" cy="256" r="210" fill="#fff5f7"/>
  <image x="${inset}" y="${inset}" width="${512 - inset * 2}" height="${512 - inset * 2}" href="data:image/png;base64,${portraitData}"/>
</svg>`;
}

async function main() {
  await mkdir(output, { recursive: true });
  // 生成时仅去除透明留白，保留完整角色；用户提供的源图保持不变。
  const portraitData = await sharp(portrait.pathname).trim().png().toBuffer();
  const icon = iconSvg(portraitData.toString("base64"), 42);
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
  // 单独留出 maskable 安全区，避免设备圆形裁切碰到角色的脸和耳朵。
  await sharp(Buffer.from(iconSvg(portraitData.toString("base64"), 90)))
    .resize(512, 512)
    .png()
    .toFile(new URL("icon-maskable-512.png", output).pathname);

  const manifest: MetadataRoute.Manifest = {
    id: "/bookkeeping",
    name: "Loopy 记账",
    short_name: "Loopy 记账",
    description: "和粉色 Loopy 一起记录日常支出与饮食热量，收藏常用项目，保存照片与账本备份。",
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
