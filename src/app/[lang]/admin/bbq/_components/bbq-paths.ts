import type { AccountingMode } from "@/lib/bbq/types";

export function bbqHomePath(
  day?: string,
  mode: AccountingMode = "shop",
): string {
  const params = new URLSearchParams({ mode });
  if (day) params.set("day", day);
  return `/admin/bbq?${params.toString()}`;
}

export function bbqNewOrderPath(
  mode: AccountingMode = "shop",
  day?: string,
): string {
  const params = new URLSearchParams({ mode });
  if (day && mode === "personal") params.set("day", day);
  return `/admin/bbq/orders/new?${params.toString()}`;
}

export function bbqOrderPath(
  id: string,
  mode: AccountingMode = "shop",
): string {
  return `/admin/bbq/orders/${encodeURIComponent(id)}?${new URLSearchParams({ mode }).toString()}`;
}

export function bbqMenuPath(): string {
  return "/admin/bbq/menu";
}
