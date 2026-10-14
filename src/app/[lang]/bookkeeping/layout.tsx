import { msg } from "@lingui/core/macro";
import type { Metadata, Viewport } from "next";
import type { PropsWithChildren } from "react";
import { getBookkeepingAlternates } from "@/lib/bookkeeping-seo";
import { getI18nInstance, type PageLangParam } from "@/lib/i18n/appRouterI18n";
import { getSiteOrigin } from "@/lib/site-origin";
import { BbqInstallProvider } from "./_components/bbq-install-button";
import { BbqMobileNav } from "./_components/bbq-mobile-nav";
import { bbqSearchDescription } from "./_components/bbq-search-copy";

export async function generateMetadata({
  params,
}: PageLangParam): Promise<Metadata> {
  const { lang } = await params;
  const i18n = getI18nInstance(lang);
  const title = i18n._(msg`Loopy 记账 · 支出与热量统计`);
  const description = i18n._(bbqSearchDescription);

  return {
    metadataBase: new URL(await getSiteOrigin()),
    title: { absolute: title },
    description,
    robots: { index: lang !== "pseudo", follow: true },
    alternates: getBookkeepingAlternates(lang),
    keywords: [
      i18n._(msg`Loopy 记账`),
      i18n._(msg`个人记账`),
      i18n._(msg`支出统计`),
      i18n._(msg`日常消费`),
      i18n._(msg`热量记录`),
      i18n._(msg`菜单管理`),
      i18n._(msg`订单记录`),
    ],
    openGraph: {
      title,
      description,
      url: `/${lang}/bookkeeping`,
      siteName: i18n._(msg`Loopy 记账`),
      type: "website",
      locale: lang === "zh" ? "zh_CN" : lang,
    },
    twitter: { card: "summary", title, description },
    applicationName: i18n._(msg`Loopy 记账`),
    manifest: "/bbq-pwa/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      title: i18n._(msg`Loopy 记账`),
      statusBarStyle: "default",
    },
    icons: {
      icon: [
        {
          url: "/bbq-pwa/icon-16.png?v=loopy-2",
          sizes: "16x16",
          type: "image/png",
        },
        {
          url: "/bbq-pwa/icon-32.png?v=loopy-2",
          sizes: "32x32",
          type: "image/png",
        },
        {
          url: "/bbq-pwa/icon-192.png?v=loopy-2",
          sizes: "192x192",
          type: "image/png",
        },
      ],
      shortcut: "/bbq-pwa/icon-32.png?v=loopy-2",
      apple: [
        { url: "/bbq-pwa/apple-touch-icon.png?v=loopy-2", sizes: "180x180" },
      ],
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#fff5f7",
};

export default function BbqLayout({ children }: PropsWithChildren) {
  return (
    <BbqInstallProvider>
      <div className="min-w-0 flex flex-col mx-auto w-full max-w-xl flex-none pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] h-dvh overflow-hidden">
        <div className="min-w-0 flex flex-1 flex-col min-h-0 overflow-hidden px-2">
          {children}
        </div>
        <BbqMobileNav />
      </div>
    </BbqInstallProvider>
  );
}
