export type Locale = "en" | "zh";

export const locales: Locale[] = ["en", "zh"];
export const sourceLocale = "en";

export type AppLocale = Locale;

export const availableLocales = locales;

export const languageNames: Record<AppLocale, string> = {
  en: "English",
  zh: "中文",
};

export const languageShortNames: Record<AppLocale, string> = {
  en: "EN",
  zh: "中",
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

const unlocalizedRoots = new Set(["agent", "agui", "api", "pdfjs"]);

export function isBookkeepingPath(pathname: string): boolean {
  return pathname === "/bookkeeping" || pathname.startsWith("/bookkeeping/");
}

/** BBQ defaults to Chinese; explicit locales remain available for every route. */
export function withLocalePrefix(href: string, locale: string): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;

  const path = href.split(/[?#]/, 1)[0] ?? href;
  const suffix = href.slice(path.length);
  const first = path.split("/").filter(Boolean)[0];

  if (first && (isLocale(first) || unlocalizedRoots.has(first))) return href;
  // Keep BBQ language explicit so English navigation never falls back to Chinese.
  if (locale === sourceLocale && !isBookkeepingPath(path)) return href;
  if (path === "/") return `/${locale}${suffix}`;
  return `/${locale}${path}${suffix}`;
}
