import { isLocale, locales } from "../i18n/locales";

export const bookkeepingLocales = locales;

export function bookkeepingPath(
  path = "",
  query?: Record<string, string>,
): string {
  const pathname = path ? `/bookkeeping/${path}` : "/bookkeeping";
  const search = new URLSearchParams(query).toString();
  return search ? `${pathname}?${search}` : pathname;
}

export type BookkeepingRoute = {
  locale: string;
  page:
    | ""
    | "menu"
    | "settings"
    | "announcements"
    | "tools"
    | "orders/new"
    | "orders/[id]";
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
  if (!tail || tail === "offline") return { locale, page: "" };
  if (
    tail === "menu" ||
    tail === "settings" ||
    tail === "announcements" ||
    tail === "tools" ||
    tail === "orders/new"
  )
    return { locale, page: tail };
  const order = /^orders\/([^/]+)$/.exec(tail);
  if (!order) return null;
  try {
    return {
      locale,
      page: "orders/[id]",
      orderId: decodeURIComponent(order[1]),
    };
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
