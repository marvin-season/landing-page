import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { summarizeOrdersByBusinessDay } from "./statistics";
import type { Order } from "./types";

describe("summarizeOrdersByBusinessDay", () => {
  it("groups orders by period and only totals completed orders", () => {
    const summaries = summarizeOrdersByBusinessDay([
      order({ id: "o3", businessDayKey: "2026-10-10", totalCents: 3000 }),
      order({
        id: "o1",
        businessDayKey: "2026-10-09#off",
        openedAt: "2026-10-09T02:00:00.000Z",
        totalCents: 1000,
      }),
      order({
        id: "o2",
        businessDayKey: "2026-10-10",
        openedAt: "2026-10-10T04:00:00.000Z",
        status: "open",
        totalCents: 2000,
      }),
    ]);

    assert.deepEqual(summaries, [
      {
        businessDayKey: "2026-10-09#off",
        firstOpenedAt: "2026-10-09T02:00:00.000Z",
        orderCount: 1,
        settledOrderCount: 1,
        settledTotalCents: 1000,
      },
      {
        businessDayKey: "2026-10-10",
        firstOpenedAt: "2026-10-10T04:00:00.000Z",
        orderCount: 2,
        settledOrderCount: 1,
        settledTotalCents: 3000,
      },
    ]);
  });
});

function order(overrides: Partial<Order>): Order {
  return {
    id: "order",
    businessDayKey: "2026-10-10",
    seq: 1,
    seat: 1,
    status: "done",
    openedAt: "2026-10-10T06:00:00.000Z",
    lines: [],
    photos: [],
    totalCents: 0,
    ...overrides,
  };
}
