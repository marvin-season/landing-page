export const locales = [
  "en",
  "zh",
  "ja",
  "ko",
  "ru",
  "fr",
  "ar",
  "ug",
  "pseudo",
] as const;
export const sourceLocale = "en";
export const pseudoLocale = "pseudo";
export const rtlLocales = ["ar", "ug"] as const;

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
  ru: "Русский",
  fr: "Français",
  ar: "العربية",
  ug: "ئۇيغۇرچە",
};

export const languageShortNames: Record<AppLocale, string> = {
  en: "EN",
  zh: "中",
  ja: "日",
  ko: "한",
  ru: "RU",
  fr: "FR",
  ar: "ع",
  ug: "UG",
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function getLocaleDir(locale: string): "ltr" | "rtl" {
  return (rtlLocales as readonly string[]).includes(locale) ? "rtl" : "ltr";
}
