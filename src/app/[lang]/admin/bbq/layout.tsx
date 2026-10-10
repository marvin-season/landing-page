import type { Metadata, Viewport } from "next";
import type { PropsWithChildren } from "react";

const title = "天天记账 · 支出与热量统计";
const description =
  "天天记账支持个人支出、日常消费与订单记录，管理常用项目和餐饮菜单，按时段统计金额与饮食热量，支持照片留存及数据备份。";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  keywords: [
    "天天记账",
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
    siteName: "天天记账",
    type: "website",
    locale: "zh_CN",
  },
  twitter: { card: "summary", title, description },
  applicationName: "天天记账",
  manifest: "/bbq-pwa/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "天天记账",
    statusBarStyle: "default",
  },
  icons: {
    icon: [{ url: "/bbq-pwa/icon-192.png", sizes: "192x192" }],
    apple: [{ url: "/bbq-pwa/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#b9443d",
};

export default function BbqLayout({ children }: PropsWithChildren) {
  return children;
}
