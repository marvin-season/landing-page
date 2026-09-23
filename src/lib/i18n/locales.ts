export const locales = ["en", "zh", "ja", "ko", "pseudo"] as const;
export const sourceLocale = "en";
export const pseudoLocale = "pseudo";

export type Locale = (typeof locales)[number];
export type AppLocale = Exclude<Locale, typeof pseudoLocale>;

export const availableLocales = locales.filter(
  (locale): locale is AppLocale => locale !== pseudoLocale,
);

export const languageNames: Record<AppLocale, string> = {
  en: "English",
  zh: "中文",
  ja: "日本語",
  ko: "한국어",
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
