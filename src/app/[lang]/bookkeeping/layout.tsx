import { msg } from "@lingui/core/macro";
import type { Metadata, Viewport } from "next";
import { type PropsWithChildren, Suspense } from "react";
import { getBookkeepingAlternates } from "@/lib/bookkeeping-seo";
import { getI18nInstance, type PageLangParam } from "@/lib/i18n/appRouterI18n";
import { getSiteOrigin } from "@/lib/site-origin";
import { App } from "./_components/app/app";
import { MobileNav } from "./_components/app/mobile-nav";
import { CompanionAlbumProvider } from "./_components/companion/companion-album-provider";
import { InstallProvider } from "./_components/pwa/install-button";
import { OfflineProvider } from "./_components/pwa/offline-provider";
import { searchDescription } from "./_lib/search-copy";

export async function generateMetadata({
  params,
}: PageLangParam): Promise<Metadata> {
  const { lang } = await params;
  const i18n = getI18nInstance(lang);
  const title = i18n._(msg`记露 · 支出与热量统计`);
  const description = i18n._(searchDescription);

  return {
    metadataBase: new URL(await getSiteOrigin()),
    title: { absolute: title },
    description,
    robots: { index: lang !== "pseudo", follow: true },
    alternates: getBookkeepingAlternates(lang),
    keywords: [
      i18n._(msg`记露`),
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
      siteName: i18n._(msg`记露`),
      type: "website",
      locale: lang === "zh" ? "zh_CN" : lang,
    },
    twitter: { card: "summary", title, description },
    applicationName: i18n._(msg`记露`),
    manifest: "/bbq-pwa/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      title: i18n._(msg`记露`),
      statusBarStyle: "default",
    },
    icons: {
      icon: [
        {
          url: "/bbq-pwa/icon-16.png?v=luji-1",
          sizes: "16x16",
          type: "image/png",
        },
        {
          url: "/bbq-pwa/icon-32.png?v=luji-1",
          sizes: "32x32",
          type: "image/png",
        },
        {
          url: "/bbq-pwa/icon-192.png?v=luji-1",
          sizes: "192x192",
          type: "image/png",
        },
      ],
      shortcut: "/bbq-pwa/icon-32.png?v=luji-1",
      apple: [
        { url: "/bbq-pwa/apple-touch-icon.png?v=luji-1", sizes: "180x180" },
      ],
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#fff5f7",
};

export default function Layout({ children }: PropsWithChildren) {
  return (
    <CompanionAlbumProvider>
      <InstallProvider>
        {/* 将记账外壳固定在视口内，避免外层页面滚动时带走底部导航。 */}
        <div className="min-w-0 flex flex-col lg:flex-row-reverse lg:py-0 mx-auto w-full max-w-xl lg:max-w-5xl flex-none pb-[calc(1rem+env(safe-area-inset-bottom))] h-dvh overflow-hidden fixed inset-x-0 top-0 overscroll-none">
          <div className="min-w-0 flex flex-1 flex-col min-h-0 overflow-hidden px-2 lg:px-4 pt-2 lg:pt-4">
            <Suspense fallback={null}>
              <OfflineProvider>
                <App>{children}</App>
              </OfflineProvider>
            </Suspense>
          </div>
          <MobileNav />
        </div>
      </InstallProvider>
    </CompanionAlbumProvider>
  );
}
