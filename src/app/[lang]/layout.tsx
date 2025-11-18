import { msg } from "@lingui/core/macro";
import { setI18n } from "@lingui/react/server";
import type { PropsWithChildren } from "react";
import { allMessages, getI18nInstance } from "@/lib/i18n/appRouterI18n";
import type { PageLangParam } from "@/lib/i18n/initLingui";
import { LinguiClientProvider } from "@/lib/i18n/LinguiClientProvider";
import linguiConfig from "~/lingui.config";
export async function generateStaticParams() {
  return linguiConfig.locales.map((lang) => ({ lang }));
}

export async function generateMetadata(props: PageLangParam) {
  const i18n = getI18nInstance((await props.params).lang);

  return {
    title: i18n._(msg`Translation Demo`),
  };
}

export default async function RootLayout({
  children,
  params,
}: PropsWithChildren<PageLangParam>) {
  const lang = (await params).lang;
  const i18n = getI18nInstance(lang);

  // @ts-expect-error
  setI18n(i18n);

  return (
    <html lang={lang}>
      <body className="bg-background text-foreground">
        <main className="min-h-screen flex flex-col">
          <LinguiClientProvider
            initialLocale={lang}
            initialMessages={allMessages[lang]}
          >
            {children}
          </LinguiClientProvider>
        </main>
      </body>
    </html>
  );
}
