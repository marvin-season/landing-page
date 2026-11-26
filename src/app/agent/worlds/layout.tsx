import localFont from "next/font/local";
import type { ReactNode } from "react";
import { WorldsFontScope } from "./_components/worlds-font-scope";

const liuJianMaoCao = localFont({
  src: "../../../fonts/LiuJianMaoCao-Regular.ttf",
  weight: "400",
  style: "normal",
  display: "swap",
  variable: "--font-liu-jian-mao-cao",
  fallback: ["cursive", "serif"],
});

export default function WorldsLayout({ children }: { children: ReactNode }) {
  return (
    <WorldsFontScope
      className={`${liuJianMaoCao.variable} ${liuJianMaoCao.className}`}
    >
      {children}
    </WorldsFontScope>
  );
}
