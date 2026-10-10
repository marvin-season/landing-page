import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertCaloriesKcal,
  formatCalories,
  summarizeCalories,
} from "./calories";
import { summarizeOrdersByBusinessDay } from "./statistics";
import type { Order } from "./types";

describe("calories", () => {
  it("distinguishes missing values, explicit zero, and partially recorded totals", () => {
    assert.equal(formatCalories(summarizeCalories([])), "未记录");
    assert.equal(
      formatCalories(summarizeCalories([{ quantity: 2 }])),
      "未记录",
    );
    assert.equal(
      formatCalories(summarizeCalories([{ quantity: 2, caloriesKcal: 0 }])),
      "0 kcal",
    );
    const lines = [{ quantity: 3, caloriesKcal: 120.5 }, { quantity: 1 }];
    assert.equal(
      formatCalories(summarizeCalories(lines)),
      "361.5 kcal（部分）",
    );
    assert.equal(
      formatCalories(summarizeCalories([{ quantity: 3, caloriesKcal: 0.1 }])),
      "0.3 kcal",
    );
  });

  it("rejects invalid values and accepts omitted or decimal calories", () => {
    for (const value of [
      Number.NEGATIVE_INFINITY,
      -Number.MAX_VALUE,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.MAX_VALUE,
    ]) {
      assert.throws(() => assertCaloriesKcal(value), /invalid_calories/);
    }
    assert.equal(assertCaloriesKcal(undefined), null);
    assert.equal(assertCaloriesKcal(null), null);
    assert.equal(assertCaloriesKcal(12.5), 12.5);
    assert.equal(assertCaloriesKcal(-200.5), -200.5);
  });

  it("only totals completed records and preserves unknown calorie coverage", () => {
    const record: Order = {
      id: "done",
      businessDayKey: "2026-10-10",
      seq: 1,
      seat: null,
      status: "done",
      openedAt: "2026-10-10T06:00:00.000Z",
      photos: [],
      totalCents: 500,
      lines: [
        {
          id: "line",
          dishId: null,
          name: "午餐",
          priceCents: 250,
          unit: "份",
          quantity: 2,
          lineCents: 500,
          caloriesKcal: 300,
        },
      ],
    };
    const [summary] = summarizeOrdersByBusinessDay([
      record,
      { ...record, id: "open", status: "open" },
      {
        ...record,
        id: "legacy",
        lines: [{ ...record.lines[0], caloriesKcal: undefined }],
      },
    ]);
    assert.equal(summary.settledTotalCents, 1000);
    assert.deepEqual(summary.settledCalories, {
      totalKcal: 600,
      recordedLineCount: 1,
      missingLineCount: 1,
    });
    assert.equal(formatCalories(summary.settledCalories), "600 kcal（部分）");
  });
});

it("deducts exercise by quantity and includes negative completed totals in statistics", () => {
  const lines = [
    { caloriesKcal: 500, quantity: 1 },
    { caloriesKcal: -300.5, quantity: 2 },
  ];
  assert.equal(formatCalories(summarizeCalories(lines)), "-101 kcal");
  assert.equal(
    formatCalories(summarizeCalories([...lines, { quantity: 1 }])),
    "-101 kcal（部分）",
  );
  assert.equal(
    formatCalories(summarizeCalories([{ caloriesKcal: -0.1, quantity: 3 }])),
    "-0.3 kcal",
  );
  const record: Order = {
    id: "exercise",
    businessDayKey: "2026-10-10",
    seq: 1,
    seat: null,
    status: "done",
    openedAt: "2026-10-10T06:00:00.000Z",
    photos: [],
    totalCents: 0,
    lines: [
      {
        id: "run",
        dishId: null,
        name: "跑步",
        priceCents: 0,
        unit: "次",
        quantity: 2,
        lineCents: 0,
        caloriesKcal: -300.5,
      },
    ],
  };
  const [summary] = summarizeOrdersByBusinessDay([
    record,
    { ...record, id: "pending", status: "open" },
  ]);
  assert.equal(formatCalories(summary.settledCalories), "-601 kcal");
});
