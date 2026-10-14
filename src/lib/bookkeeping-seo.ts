import type { Metadata } from "next";
import { availableLocales } from "@/lib/i18n/locales";

export function getBookkeepingAlternates(lang: string, path = "") {
  return {
    canonical: `/${lang}/bookkeeping${path}`,
    languages: {
      ...Object.fromEntries(
        availableLocales.map((locale) => [
          locale,
          `/${locale}/bookkeeping${path}`,
        ]),
      ),
      "x-default": `/zh/bookkeeping${path}`,
    },
  };
}

export function getBookkeepingPageMetadata(
  lang: string,
  path: string,
  title: string,
  description: string,
): Metadata {
  return {
    title: { absolute: title },
    description,
    alternates: getBookkeepingAlternates(lang, path),
    openGraph: {
      title,
      description,
      url: `/${lang}/bookkeeping${path}`,
      type: "website",
      locale: lang === "zh" ? "zh_CN" : lang,
    },
    twitter: { card: "summary", title, description },
  };
}
