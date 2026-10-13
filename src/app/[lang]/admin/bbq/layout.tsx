import type { Metadata, Viewport } from "next";
import type { PropsWithChildren } from "react";
import { BbqInstallProvider } from "./_components/bbq-install-button";
import { BbqMobileNav } from "./_components/bbq-mobile-nav";

const title = "Loopy 记账 · 支出与热量统计";
const description =
  "和粉色 Loopy 一起记录日常支出与饮食热量，收藏常用项目，保存照片与账本备份。";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  keywords: [
    "Loopy 记账",
    "个人记账",
    "支出统计",
    "日常消费",
    "热量记录",
    "菜单管理",
    "订单记录",
  ],
  openGraph: {
    title,
    description,
    siteName: "Loopy 记账",
    type: "website",
    locale: "zh_CN",
  },
  twitter: { card: "summary", title, description },
  applicationName: "Loopy 记账",
  manifest: "/bbq-pwa/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Loopy 记账",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      {
        url: "/bbq-pwa/icon-16.png?v=loopy-1",
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: "/bbq-pwa/icon-32.png?v=loopy-1",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/bbq-pwa/icon-192.png?v=loopy-1",
        sizes: "192x192",
        type: "image/png",
      },
    ],
    shortcut: "/bbq-pwa/icon-32.png?v=loopy-1",
    apple: [
      { url: "/bbq-pwa/apple-touch-icon.png?v=loopy-1", sizes: "180x180" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#fff5f7",
};

export default function BbqLayout({ children }: PropsWithChildren) {
  return (
    <BbqInstallProvider>
      <div className="min-w-0 flex flex-col mx-auto w-full max-w-xl flex-none pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] h-dvh overflow-hidden">
        <div className="min-w-0 flex flex-1 flex-col min-h-0 overflow-hidden">
          {children}
        </div>
        <BbqMobileNav />
      </div>
    </BbqInstallProvider>
  );
}
