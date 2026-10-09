export function bbqHomePath(day?: string): string {
  if (!day) return "/admin/bbq";
  return `/admin/bbq?${new URLSearchParams({ day }).toString()}`;
}

export function bbqNewOrderPath(): string {
  return "/admin/bbq/orders/new";
}

export function bbqOrderPath(id: string): string {
  return `/admin/bbq/orders/${encodeURIComponent(id)}`;
}

export function bbqMenuPath(): string {
  return "/admin/bbq/menu";
}
