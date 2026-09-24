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

const unlocalizedRoots = new Set([
  "admin",
  "agent",
  "agui",
  "api",
  "auth",
  "pdfjs",
]);

/** Prefix an internal path with the current locale. `en` stays unprefixed. */
export function withLocalePrefix(href: string, locale: string): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;

  const path = href.split(/[?#]/, 1)[0] ?? href;
  const suffix = href.slice(path.length);
  const first = path.split("/").filter(Boolean)[0];

  if (first && (isLocale(first) || unlocalizedRoots.has(first))) return href;
  if (locale === sourceLocale) return href;
  if (path === "/") return `/${locale}${suffix}`;
  return `/${locale}${path}${suffix}`;
}

export function getLocaleDir(locale: string): "ltr" | "rtl" {
  return (rtlLocales as readonly string[]).includes(locale) ? "rtl" : "ltr";
}
