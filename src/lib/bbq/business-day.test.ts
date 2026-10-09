import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  businessDayKey,
  businessDayLabel,
  canCreateOrderForBusinessDay,
  currentBusinessDayKey,
  formatShanghaiHm,
  isBusinessHours,
  shiftBusinessDayKey,
} from "./business-day";

describe("business day", () => {
  it("starts the business day at 15:00 Shanghai", () => {
    assert.equal(
      businessDayKey(new Date("2026-10-10T07:00:00.000Z")),
      "2026-10-10",
    );
  });

  it("keeps 02:59 Shanghai on the previous business day", () => {
    assert.equal(
      businessDayKey(new Date("2026-10-10T18:59:00.000Z")),
      "2026-10-10",
    );
    assert.equal(
      businessDayKey(new Date("2026-10-09T18:30:00.000Z")),
      "2026-10-09",
    );
  });

  it("starts the off period at 03:00 Shanghai", () => {
    assert.equal(
      businessDayKey(new Date("2026-10-09T19:00:00.000Z")),
      "2026-10-10#off",
    );
  });

  it("keeps 14:59 Shanghai in the off period", () => {
    assert.equal(
      businessDayKey(new Date("2026-10-10T06:59:00.000Z")),
      "2026-10-10#off",
    );
  });

  it("only opens between 15:00 and the next 03:00 Shanghai", () => {
    assert.equal(isBusinessHours(new Date("2026-10-10T06:59:00.000Z")), false);
    assert.equal(isBusinessHours(new Date("2026-10-10T07:00:00.000Z")), true);
    assert.equal(isBusinessHours(new Date("2026-10-10T18:59:00.000Z")), true);
    assert.equal(isBusinessHours(new Date("2026-10-10T19:00:00.000Z")), false);
  });

  it("only allows orders for the current open business day", () => {
    const duringBusinessHours = new Date("2026-10-10T07:00:00.000Z");
    assert.equal(
      canCreateOrderForBusinessDay(duringBusinessHours, "2026-10-10"),
      true,
    );
    assert.equal(
      canCreateOrderForBusinessDay(duringBusinessHours, "2026-10-09"),
      false,
    );
    assert.equal(
      canCreateOrderForBusinessDay(
        new Date("2026-10-10T06:59:00.000Z"),
        "2026-10-10#off",
      ),
      false,
    );
  });

  it("shifts from a business day into the next off period and back", () => {
    assert.equal(shiftBusinessDayKey("2026-10-09", 1), "2026-10-10#off");
    assert.equal(shiftBusinessDayKey("2026-10-10#off", 1), "2026-10-10");
    assert.equal(shiftBusinessDayKey("2026-10-10", -1), "2026-10-10#off");
    assert.equal(shiftBusinessDayKey("2026-10-10#off", -1), "2026-10-09");
  });

  it("labels business days and off periods", () => {
    assert.equal(businessDayLabel("2026-10-10"), "2026-10-10 营业日");
    assert.equal(businessDayLabel("2026-10-10#off"), "2026-10-10 非营业时段");
    assert.equal(
      currentBusinessDayKey(new Date("2026-10-10T07:00:00.000Z")),
      "2026-10-10",
    );
  });

  it("formats Shanghai clock time", () => {
    assert.equal(
      formatShanghaiHm(new Date("2026-10-09T18:30:00.000Z")),
      "02:30",
    );
    assert.equal(
      formatShanghaiHm(new Date("2026-10-10T04:00:00.000Z")),
      "12:00",
    );
  });
});
