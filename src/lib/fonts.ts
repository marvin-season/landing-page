import localFont from "next/font/local";

/** 全站默认字体：JetBrains Mono 可变字重（含斜体）。 */
export const jetbrainsMono = localFont({
  src: [
    {
      path: "../fonts/JetBrainsMono-VariableFont_wght.ttf",
      weight: "100 800",
      style: "normal",
    },
    {
      path: "../fonts/JetBrainsMono-Italic-VariableFont_wght.ttf",
      weight: "100 800",
      style: "italic",
    },
  ],
  variable: "--font-jetbrains-mono",
  display: "swap",
  fallback: [
    "ui-monospace",
    "SFMono-Regular",
    "Menlo",
    "Consolas",
    "monospace",
  ],
});
