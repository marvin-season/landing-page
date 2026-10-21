import { isLocale, locales } from "../i18n/locales";

export const bookkeepingLocales = locales;

export type BookkeepingRoute = {
  locale: string;
  page: "home" | "menu" | "settings" | "announcements" | "tools" | "editor";
  orderId?: string;
};

/** Keep the existing URLs; record IDs are resolved from IndexedDB, never RSC. */
export function readBookkeepingRoute(
  pathname: string,
): BookkeepingRoute | null {
  const match = /^\/([a-z]+)\/bookkeeping(?:\/(.*?))?\/?$/.exec(pathname);
  if (!match) return null;
  const [, locale, tail = ""] = match;
  if (!isLocale(locale)) return null;
  if (!tail || tail === "offline") return { locale, page: "home" };
  if (
    tail === "menu" ||
    tail === "settings" ||
    tail === "announcements" ||
    tail === "tools"
  )
    return { locale, page: tail };
  if (tail === "orders/new") return { locale, page: "editor" };
  const order = /^orders\/([^/]+)$/.exec(tail);
  if (!order) return null;
  try {
    return { locale, page: "editor", orderId: decodeURIComponent(order[1]) };
  } catch {
    return null;
  }
}

export function canNavigateBookkeepingLocally(from: URL, to: URL): boolean {
  const current = readBookkeepingRoute(from.pathname);
  const target = readBookkeepingRoute(to.pathname);
  return Boolean(
    from.origin === to.origin &&
      current &&
      target &&
      current.locale === target.locale,
  );
}
