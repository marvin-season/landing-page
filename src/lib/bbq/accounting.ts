import {
  businessDayLabel,
  currentBusinessDayKey,
  formatShanghaiDate,
  readBusinessDayParam,
  shiftBusinessDayKey,
} from "./business-day";
import type { AccountingMode, Order } from "./types";

export function readAccountingMode(value: unknown): AccountingMode {
  return value === "personal" ? "personal" : "shop";
}

export function accountingDay(mode: AccountingMode, now: Date): string {
  return mode === "personal"
    ? formatShanghaiDate(now)
    : currentBusinessDayKey(now);
}

export function readAccountingDay(
  mode: AccountingMode,
  value: string | null,
  now: Date,
): string {
  if (mode === "shop") return readBusinessDayParam(value, now);
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T12:00:00+08:00`);
    if (!Number.isNaN(date.getTime()) && formatShanghaiDate(date) === value)
      return value;
  }
  return accountingDay(mode, now);
}

export function shiftAccountingDay(
  mode: AccountingMode,
  day: string,
  direction: -1 | 1,
): string {
  if (mode === "shop") return shiftBusinessDayKey(day, direction);
  const date = new Date(`${day}T12:00:00+08:00`);
  date.setUTCDate(date.getUTCDate() + direction);
  return formatShanghaiDate(date);
}

export function accountingDayLabel(mode: AccountingMode, day: string): string {
  return mode === "personal" ? day : businessDayLabel(day);
}

export function orderLabel(mode: AccountingMode, order: Order): string {
  if (mode === "personal")
    return order.lines.map((line) => line.name).join("、") || "个人订单";
  return order.seat === null ? "打包" : `${order.seat} 号座`;
}
