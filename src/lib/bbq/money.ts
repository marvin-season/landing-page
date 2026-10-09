import { BbqStoreError } from "./store";

export function assertPriceCents(value: number): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new BbqStoreError("invalid_money");
  }
  return value;
}

export function assertQuantity(value: number): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new BbqStoreError("invalid_money");
  }
  return value;
}

export function lineCents(priceCents: number, quantity: number): number {
  return assertPriceCents(priceCents) * assertQuantity(quantity);
}

export function totalCents(
  lines: ReadonlyArray<{ lineCents: number }>,
): number {
  let total = 0;
  for (const line of lines) {
    if (!Number.isInteger(line.lineCents) || line.lineCents < 0) {
      throw new BbqStoreError("invalid_money");
    }
    total += line.lineCents;
  }
  return total;
}

export function formatYuan(cents: number): string {
  if (!Number.isInteger(cents)) {
    throw new BbqStoreError("invalid_money");
  }
  const negative = cents < 0;
  const absolute = Math.abs(cents);
  const yuan = Math.floor(absolute / 100);
  const fraction = String(absolute % 100).padStart(2, "0");
  return `${negative ? "-" : ""}¥${yuan}.${fraction}`;
}

const YUAN_INPUT = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;

export function parseYuanToCents(input: string): number | null {
  const trimmed = input.trim();
  if (!YUAN_INPUT.test(trimmed)) return null;
  const [yuanPart, fraction = ""] = trimmed.split(".");
  return Number(yuanPart) * 100 + Number(fraction.padEnd(2, "0"));
}

export function centsToYuanInput(cents: number): string {
  const price = assertPriceCents(cents);
  const yuan = Math.floor(price / 100);
  const fraction = String(price % 100).padStart(2, "0");
  return `${yuan}.${fraction}`;
}
