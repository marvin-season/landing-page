import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  accountingDay,
  readAccountingDay,
  shiftAccountingDay,
} from "./accounting";
import {
  type DocumentClock,
  deleteOrder,
  emptyDocument,
  exportBackup,
  listOrders,
  mergeBackup,
  saveOrder,
} from "./document";
import { summarizeOrdersByBusinessDay } from "./statistics";
import type { SaveOrderInput, SaveOrderLineInput } from "./types";

function setup() {
  let sequence = 0;
  const clock: DocumentClock = {
    mode: "personal",
    now: new Date("2026-10-10T02:30:00+08:00"),
    createId: () => `personal-${++sequence}`,
  };
  const lines: SaveOrderLineInput[] = [
    { dishId: null, name: " 早餐 ", priceCents: 1250, quantity: 2, unit: "份" },
    { dishId: null, name: "纸巾", priceCents: 399, quantity: 3, unit: "包" },
  ];
  const input: SaveOrderInput = { seat: null, status: "open", lines };
  return { clock, input };
}

describe("personal accounting", () => {
  it("saves multiple manual items without a menu, using the natural day at 02:30", () => {
    const { clock, input } = setup();
    const { order } = saveOrder(emptyDocument(), input, clock);
    assert.equal(order.businessDayKey, "2026-10-10");
    assert.equal(order.totalCents, 3697);
    assert.deepEqual(
      order.lines.map((line) => line.name),
      ["早餐", "纸巾"],
    );
    assert.ok(order.lines.every((line) => line.dishId === null));
    assert.equal(order.seat, null);
  });

  it("supports recording during shop off hours and separates the next midnight", () => {
    const { clock, input } = setup();
    const first = saveOrder(
      emptyDocument(),
      { ...input, openedAt: "2026-10-10T04:00:00+08:00" },
      clock,
    );
    const second = saveOrder(
      first.document,
      { ...input, openedAt: "2026-10-11T00:00:00+08:00" },
      clock,
    );
    assert.equal(first.order.businessDayKey, "2026-10-10");
    assert.equal(second.order.businessDayKey, "2026-10-11");
    assert.equal(second.order.seq, 1);
  });

  it("edits item names and prices, removes items and retains photos on status updates", () => {
    const { clock, input } = setup();
    const photos = [
      {
        id: "photo-1",
        dataUrl: "data:image/jpeg;base64,YQ==",
        createdAt: clock.now.toISOString(),
      },
    ];
    const first = saveOrder(emptyDocument(), { ...input, photos }, clock);
    const edited = saveOrder(
      first.document,
      {
        id: first.order.id,
        seat: null,
        status: "done",
        lines: [
          {
            ...first.order.lines[0],
            name: "午餐",
            priceCents: 1800,
            quantity: 3,
          },
        ],
      },
      clock,
    );
    assert.equal(edited.order.lines.length, 1);
    assert.equal(edited.order.lines[0].id, first.order.lines[0].id);
    assert.equal(edited.order.lines[0].name, "午餐");
    assert.equal(edited.order.totalCents, 5400);
    assert.deepEqual(edited.order.photos, photos);
    assert.equal(edited.order.status, "done");
    assert.equal(edited.order.openedAt, first.order.openedAt);
    const reopened = saveOrder(
      edited.document,
      { ...edited.order, status: "open" },
      clock,
    );
    assert.equal(
      summarizeOrdersByBusinessDay(reopened.document.orders)[0]
        .settledTotalCents,
      0,
    );
    assert.equal(
      deleteOrder(reopened.document, first.order.id).orders.length,
      0,
    );
  });

  it("moves an edited order to another date and allocates a new sequence there", () => {
    const { clock, input } = setup();
    const first = saveOrder(emptyDocument(), input, clock);
    const second = saveOrder(
      first.document,
      { ...input, openedAt: "2026-10-09T12:00:00+08:00" },
      clock,
    );
    const moved = saveOrder(
      second.document,
      { ...first.order, openedAt: "2026-10-09T13:00:00+08:00" },
      clock,
    );
    assert.equal(moved.order.businessDayKey, "2026-10-09");
    assert.equal(moved.order.seq, 2);
    assert.equal(listOrders(moved.document, "2026-10-10").length, 0);
    assert.equal(listOrders(moved.document, "2026-10-09").length, 2);
  });

  it("aggregates only completed personal spending by date", () => {
    const { clock, input } = setup();
    const first = saveOrder(
      emptyDocument(),
      { ...input, status: "done" },
      clock,
    );
    const second = saveOrder(first.document, input, clock);
    const [stats] = summarizeOrdersByBusinessDay(second.document.orders);
    assert.equal(stats.orderCount, 2);
    assert.equal(stats.settledOrderCount, 1);
    assert.equal(stats.settledTotalCents, 3697);
  });

  it("round-trips personal backups and refuses imports into the wrong ledger", () => {
    const { clock, input } = setup();
    const saved = saveOrder(emptyDocument(), input, clock);
    const backup = exportBackup(saved.document, {}, "personal");
    assert.equal(backup.accountingMode, "personal");
    assert.deepEqual(
      mergeBackup(emptyDocument(), backup, "personal"),
      saved.document,
    );
    assert.throws(() => mergeBackup(emptyDocument(), backup), {
      code: "backup_mode_mismatch",
    });
    const legacy = exportBackup(emptyDocument());
    assert.equal(legacy.accountingMode, undefined);
    assert.throws(() => mergeBackup(emptyDocument(), legacy, "personal"), {
      code: "backup_mode_mismatch",
    });
    assert.deepEqual(mergeBackup(emptyDocument(), legacy), emptyDocument());
  });

  it("rejects empty orders, invalid names, prices and quantities", () => {
    const { clock, input } = setup();
    assert.throws(() =>
      saveOrder(emptyDocument(), { ...input, lines: [] }, clock),
    );
    for (const patch of [
      { name: " " },
      { priceCents: -1 },
      { priceCents: 1.2 },
      { quantity: 0 },
      { quantity: 1.5 },
      { quantity: Number.MAX_SAFE_INTEGER + 1 },
      { priceCents: Number.MAX_SAFE_INTEGER },
    ]) {
      assert.throws(() =>
        saveOrder(
          emptyDocument(),
          { ...input, lines: [{ ...input.lines[0], ...patch }] },
          clock,
        ),
      );
    }
    assert.throws(
      () =>
        saveOrder(emptyDocument(), { ...input, openedAt: "invalid" }, clock),
      { code: "invalid_date" },
    );
  });

  it("continues rejecting menu-free new lines in shop mode", () => {
    const { clock, input } = setup();
    assert.throws(
      () => saveOrder(emptyDocument(), input, { ...clock, mode: "shop" }),
      { code: "dish_unavailable" },
    );
  });

  it("rejects mislabeled personal backups containing shop day keys or menu references", () => {
    const { clock, input } = setup();
    const { document } = saveOrder(emptyDocument(), input, clock);
    const backup = exportBackup(document, {}, "personal");
    assert.throws(
      () =>
        mergeBackup(
          emptyDocument(),
          {
            ...backup,
            orders: [{ ...backup.orders[0], businessDayKey: "2026-10-10#off" }],
          },
          "personal",
        ),
      { code: "invalid_backup" },
    );
    assert.throws(
      () =>
        mergeBackup(
          emptyDocument(),
          {
            ...backup,
            orders: [
              {
                ...backup.orders[0],
                lines: [{ ...backup.orders[0].lines[0], dishId: "shop-dish" }],
              },
            ],
          },
          "personal",
        ),
      { code: "invalid_backup" },
    );
  });

  it("uses natural dates for personal navigation, retaining shop period navigation", () => {
    const now = new Date("2026-10-10T02:30:00+08:00");
    assert.equal(accountingDay("personal", now), "2026-10-10");
    assert.equal(accountingDay("shop", now), "2026-10-09");
    assert.equal(shiftAccountingDay("personal", "2026-12-31", 1), "2027-01-01");
    assert.equal(
      shiftAccountingDay("personal", "2026-03-01", -1),
      "2026-02-28",
    );
    assert.equal(shiftAccountingDay("shop", "2026-10-10", 1), "2026-10-11#off");
    for (const invalid of [null, "bad", "2026-02-30", "2026-10-10#off"]) {
      assert.equal(readAccountingDay("personal", invalid, now), "2026-10-10");
    }
    assert.equal(
      readAccountingDay("personal", "2026-09-01", now),
      "2026-09-01",
    );
  });
});
