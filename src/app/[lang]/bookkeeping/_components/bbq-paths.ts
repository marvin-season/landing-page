export function bbqHomePath(day?: string): string {
  if (!day) return "/bookkeeping";
  return `/bookkeeping?${new URLSearchParams({ day }).toString()}`;
}

export function bbqNewOrderPath(): string {
  return "/bookkeeping/orders/new";
}

export function bbqOrderPath(id: string): string {
  return `/bookkeeping/orders/${encodeURIComponent(id)}`;
}

export function bbqMenuPath(): string {
  return "/bookkeeping/menu";
}

export function bbqSettingsPath(): string {
  return "/bookkeeping/settings";
}
