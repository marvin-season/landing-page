import { type CalorieSummary, summarizeCalories } from "./calories";
import type { Order } from "./types";

export type BusinessDayStatistics = {
  businessDayKey: string;
  firstOpenedAt: string;
  orderCount: number;
  settledOrderCount: number;
  settledTotalCents: number;
  settledCalories: CalorieSummary;
};

export function summarizeOrdersByBusinessDay(
  orders: Order[],
): BusinessDayStatistics[] {
  const summaries = new Map<string, BusinessDayStatistics>();

  for (const order of orders) {
    const current = summaries.get(order.businessDayKey) ?? {
      businessDayKey: order.businessDayKey,
      firstOpenedAt: order.openedAt,
      orderCount: 0,
      settledOrderCount: 0,
      settledTotalCents: 0,
      settledCalories: {
        totalKcal: 0,
        recordedLineCount: 0,
        missingLineCount: 0,
      },
    };
    current.orderCount += 1;
    if (order.openedAt < current.firstOpenedAt) {
      current.firstOpenedAt = order.openedAt;
    }
    if (order.status === "done") {
      current.settledOrderCount += 1;
      current.settledTotalCents += order.totalCents;
      const calories = summarizeCalories(order.lines);
      current.settledCalories.totalKcal += calories.totalKcal;
      current.settledCalories.recordedLineCount += calories.recordedLineCount;
      current.settledCalories.missingLineCount += calories.missingLineCount;
    }
    summaries.set(order.businessDayKey, current);
  }

  return [...summaries.values()].toSorted((left, right) =>
    left.firstOpenedAt.localeCompare(right.firstOpenedAt),
  );
}
