import "server-only";

import { isDevelopment } from "@landing-page/utils";
import { type I18n, type Messages, setupI18n } from "@lingui/core";
import { isLocale, type Locale, locales } from "@/lib/i18n/locales";

// 为了解决build时 [lang] 参数类型错误
export type TSupportedLocalesTrap = Locale | (string & {});

type AllI18nInstances = { [K in TSupportedLocalesTrap]: I18n };

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
  if (!isLocale(locale)) {
    return allI18nInstances.en;
  }

  return allI18nInstances[locale];
};

export type PageLangParam = {
  params: Promise<{ lang: TSupportedLocalesTrap }>;
};
