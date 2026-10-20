export function homePath(day?: string): string {
  if (!day) return "/bookkeeping";
  return `/bookkeeping?${new URLSearchParams({ day }).toString()}`;
}

export function newOrderPath(): string {
  return "/bookkeeping/orders/new";
}

export function orderPath(id: string): string {
  return `/bookkeeping/orders/${encodeURIComponent(id)}`;
}

export function menuPath(): string {
  return "/bookkeeping/menu";
}

export function settingsPath(): string {
  return "/bookkeeping/settings";
}

export function announcementsPath(): string {
  return "/bookkeeping/announcements";
}
