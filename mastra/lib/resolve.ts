

export function resolveStr(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const str = value.trim();
  return str.length > 0 ? str : null;
}
