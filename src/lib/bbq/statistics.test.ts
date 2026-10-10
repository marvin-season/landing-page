import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getTrendRange, summarizeOrdersByBusinessDay } from "./statistics";
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
        settledCalories: {
          totalKcal: 0,
          recordedLineCount: 0,
          missingLineCount: 0,
        },
      },
      {
        businessDayKey: "2026-10-10",
        firstOpenedAt: "2026-10-10T04:00:00.000Z",
        orderCount: 2,
        settledOrderCount: 1,
        settledTotalCents: 3000,
        settledCalories: {
          totalKcal: 0,
          recordedLineCount: 0,
          missingLineCount: 0,
        },
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

it("keeps positive, negative and mixed trend values within the axis range", () => {
  for (const [values, expected] of [
    [[-300, -100, null], { minimum: -300, maximum: 0, span: 300 }],
    [[-200, 500], { minimum: -200, maximum: 500, span: 700 }],
    [[100, 300], { minimum: 0, maximum: 300, span: 300 }],
    [[0, null], { minimum: 0, maximum: 1, span: 1 }],
    [[], { minimum: 0, maximum: 1, span: 1 }],
  ] as const) {
    const range = getTrendRange(values);
    assert.deepEqual(range, expected);
    for (const value of values) {
      if (value === null) continue;
      const position = (value - range.minimum) / range.span;
      assert.ok(position >= 0 && position <= 1);
    }
  }
});
