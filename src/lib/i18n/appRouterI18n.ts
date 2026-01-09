import "server-only";

import { type I18n, type Messages, setupI18n } from "@lingui/core";
import { isDevelopment } from "@/lib/constants";
import linguiConfig from "~/lingui.config";

const { locales } = linguiConfig;
// optionally use a stricter union type

type TSupportedLocale = (typeof locales)[number];

// 为了解决build时 [lang] 参数类型错误
export type TSupportedLocalesTrap = TSupportedLocale | (string & {});

type AllI18nInstances = { [K in TSupportedLocalesTrap]: I18n };

// 类型守卫函数
function isValidLocale(locale: string): locale is TSupportedLocale {
  return locales.includes(locale as TSupportedLocale);
}

async function loadCatalog(locale: TSupportedLocalesTrap) {
  // 先确定后缀
  const extension = isDevelopment ? "po" : "js";
  const { messages } = await import(`../../locales/${locale}.${extension}`);
  return {
    [locale]: messages as Messages,
  };
}
const catalogs = await Promise.all(locales.map(loadCatalog));

// transform array of   into a single object
export const allMessages = catalogs.reduce((acc, oneCatalog) => {
  return { ...acc, ...oneCatalog };
}, {});

export const allI18nInstances = locales.reduce((acc, locale) => {
  const messages = allMessages[locale] ?? {};
  const i18n = setupI18n({
    locale,
    messages: { [locale]: messages },
  });
  return { ...acc, [locale]: i18n };
}, {} as AllI18nInstances);

export const getI18nInstance = (locale: TSupportedLocalesTrap): I18n => {
  if (!isValidLocale(locale)) {
    return allI18nInstances.en;
  }

  return allI18nInstances[locale];
};

export type PageLangParam = {
  params: Promise<{ lang: TSupportedLocalesTrap }>;
};
