import { isLocale, locales, sourceLocale } from "@/lib/i18n/locales";

export type ProtectedPage = {
  path: string;
  locale?: boolean;
};

export const protectedPages: ProtectedPage[] = [
  { path: "/resume", locale: true },
  { path: "/agent", locale: false },
  { path: "/admin", locale: false },
];

function normalizePathname(pathname: string) {
  try {
    const decoded = decodeURIComponent(pathname);
    if (!decoded.startsWith("/") || decoded.startsWith("//")) return "/";
    return decoded.replace(/\/+$/, "") || "/";
  } catch {
    return "/";
  }
}

function matchesPage(pathname: string, page: ProtectedPage) {
  const normalized = normalizePathname(pathname);
  const prefixes = page.locale
    ? [page.path, ...locales.map((locale) => `/${locale}${page.path}`)]
    : [page.path];

  return prefixes.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}

export function getProtectedPage(pathname: string) {
  return protectedPages.find((page) => matchesPage(pathname, page));
}

export function isProtectedPath(pathname: string) {
  return getProtectedPage(pathname) !== undefined;
}

export function getSafeReturnTo(value: unknown) {
  if (typeof value !== "string") return "/";
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("://")
  ) {
    return "/";
  }

  const pathname = normalizePathname(value.split(/[?#]/, 1)[0] ?? "/");
  return isProtectedPath(pathname) ? pathname : "/";
}

function resolveAuthLocale(returnTo: string, locale?: string) {
  if (locale && isLocale(locale)) return locale;

  const first = normalizePathname(returnTo).split("/").filter(Boolean)[0];
  if (first && isLocale(first)) return first;

  return sourceLocale;
}

export function getAuthorizationUrl(returnTo: string, locale?: string) {
  const safe = getSafeReturnTo(returnTo);
  const resolved = resolveAuthLocale(safe, locale);
  const prefix = resolved === sourceLocale ? "" : `/${resolved}`;

  return `${prefix}/auth?${new URLSearchParams({
    returnTo: safe,
  })}`;
}
