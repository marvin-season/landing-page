import { isLocale, locales, sourceLocale } from "@/lib/i18n/locales";

export type ProtectedPage = {
  path: string;
  locale?: boolean;
  excludedPaths?: string[];
};

export const protectedPages: ProtectedPage[] = [
  { path: "/resume", locale: true },
  { path: "/agent", locale: false },
  { path: "/admin", locale: true, excludedPaths: ["/admin/bbq"] },
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

function localizedPrefixes(path: string, locale?: boolean) {
  return locale ? [path, ...locales.map((item) => `/${item}${path}`)] : [path];
}

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function matchesPage(pathname: string, page: ProtectedPage) {
  const normalized = normalizePathname(pathname);
  if (!matchesPrefix(normalized, localizedPrefixes(page.path, page.locale))) {
    return false;
  }

  return !(page.excludedPaths ?? []).some((path) =>
    matchesPrefix(normalized, localizedPrefixes(path, page.locale)),
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
