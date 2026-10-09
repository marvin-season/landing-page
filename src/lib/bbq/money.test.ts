import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatYuan, lineCents, totalCents } from "./money";
import { BbqStoreError } from "./store";

describe("money", () => {
  it("computes line cents and recalculates the order total from lines", () => {
    assert.equal(lineCents(1250, 2), 2500);
    assert.equal(totalCents([{ lineCents: 1250 }, { lineCents: 2500 }]), 3750);
    assert.equal(
      totalCents([
        { lineCents: lineCents(800, 3) },
        { lineCents: lineCents(100, 1) },
      ]),
      2500,
    );
  });

  it("formats cents as yuan with two decimal places", () => {
    assert.equal(formatYuan(1250), "¥12.50");
    assert.equal(formatYuan(5), "¥0.05");
    assert.equal(formatYuan(0), "¥0.00");
  });

  it("rejects fractional quantities", () => {
    assert.throws(
      () => lineCents(100, 1.5),
      (error: unknown) =>
        error instanceof BbqStoreError && error.code === "invalid_money",
    );
  });

  it("rejects negative quantities and negative prices", () => {
    assert.throws(
      () => lineCents(100, -1),
      (error: unknown) =>
        error instanceof BbqStoreError && error.code === "invalid_money",
    );
    assert.throws(
      () => lineCents(-1, 1),
      (error: unknown) =>
        error instanceof BbqStoreError && error.code === "invalid_money",
    );
  });
});
