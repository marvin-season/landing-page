import { msg } from "@lingui/core/macro";
import { setI18n } from "@lingui/react/server";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Lora } from "next/font/google";
import type { PropsWithChildren } from "react";
import { LinguiClientProvider } from "@/components/language/lingui-client-provider";
import { ThemeProvider } from "@/components/theme/theme-provider";
import {
  allMessages,
  getI18nInstance,
  type PageLangParam,
} from "@/lib/i18n/appRouterI18n";
import linguiConfig from "~/lingui.config";
import "@/css/globals.css";
import { LocatorRuntime } from "@/components/locator-runtime";
import { PageFade } from "@/components/page-transition/page-fade";
import { SettingsMenu } from "@/components/settings-menu/settings-menu";

const lora = Lora({
  weight: "400",
  style: "normal",
});

export async function generateStaticParams() {
  return linguiConfig.locales.map((lang) => ({ lang }));
}

export async function generateMetadata(props: PageLangParam) {
  const { lang } = await props.params;
  const i18n = getI18nInstance(lang);
  const siteName = i18n._(msg`Crayon Shin-chan`);

  return {
    title: {
      default: siteName,
      template: `%s · ${siteName}`,
    },
    description: i18n._(
      msg`A mischievous five-year-old who turns everyday life into an adventure.`,
    ),
    applicationName: siteName,
  };
}

export default async function RootLayout({
  children,
  params,
}: PropsWithChildren<PageLangParam>) {
  const { lang } = await params;

  const i18n = getI18nInstance(lang);

  setI18n(i18n);

  return (
    <html lang={lang as string} suppressHydrationWarning>
      <body
        className={`${lora.className} min-h-dvh antialiased shinchan:font-sans!`}
      >
        <LinguiClientProvider
          initialLocale={lang}
          initialMessages={allMessages[lang]}
        >
          <ThemeProvider>
            <LocatorRuntime />
            <SettingsMenu currentLang={lang} />
            <PageFade>{children}</PageFade>
            <Analytics />
            <SpeedInsights />
          </ThemeProvider>
        </LinguiClientProvider>
      </body>
    </html>
  );
}
