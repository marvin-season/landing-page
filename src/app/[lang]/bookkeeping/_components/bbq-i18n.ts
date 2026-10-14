import type { I18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { CalorieSummary } from "@/lib/bbq/calories";

// Translate presentation only; keep saved dates, units and calorie values intact.
export function formatCalories(i18n: I18n, summary: CalorieSummary): string {
  if (summary.recordedLineCount === 0) return i18n._(msg`未记录`);
  const value = i18n.number(Number(summary.totalKcal.toFixed(2)));
  return summary.missingLineCount > 0
    ? i18n._(msg`${value} kcal（部分）`)
    : `${value} kcal`;
}

export function businessDayLabel(i18n: I18n, key: string): string {
  const date = i18n.date(new Date(`${key.slice(0, 10)}T00:00:00Z`), {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "UTC",
  });
  return key.endsWith("#off")
    ? i18n._(msg`${date} 休息时段`)
    : i18n._(msg`${date} 记账时段`);
}
