import type { Order } from "./types";

export type BusinessDayStatistics = {
  businessDayKey: string;
  firstOpenedAt: string;
  orderCount: number;
  settledOrderCount: number;
  settledTotalCents: number;
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
    };
    current.orderCount += 1;
    if (order.openedAt < current.firstOpenedAt) {
      current.firstOpenedAt = order.openedAt;
    }
    if (order.status === "done") {
      current.settledOrderCount += 1;
      current.settledTotalCents += order.totalCents;
    }
    summaries.set(order.businessDayKey, current);
  }

  return [...summaries.values()].toSorted((left, right) =>
    left.firstOpenedAt.localeCompare(right.firstOpenedAt),
  );
}
