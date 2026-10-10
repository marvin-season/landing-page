import type { Metadata, Viewport } from "next";
import type { PropsWithChildren } from "react";
export const metadata: Metadata = {
  title: { absolute: "天天记账" },
  description: "烧烤点单、菜单管理与经营统计",
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
