import assert from "node:assert/strict";
import { it } from "node:test";
import { businessDayKey } from "./business-day";
import { emptyDocument, exportBackup, mergeBackup } from "./document";
import { createSampleBackup } from "./sample-backup";

it("imports three items and four records across three recent days, including month boundaries", () => {
  for (const time of ["2026-11-01T04:00:00Z", "2026-10-31T17:00:00Z"]) {
    const now = new Date(time);
    const backup = createSampleBackup(now, exportBackup(emptyDocument()));
    const imported = mergeBackup(emptyDocument(), backup);
    assert.equal(imported.dishes.length, 3);
    assert.equal(imported.orders.length, 4);
    assert.equal(
      new Set(imported.orders.map((order) => order.businessDayKey)).size,
      3,
    );
    for (const daysAgo of [0, 1, 2]) {
      const key = businessDayKey(
        new Date(now.getTime() - daysAgo * 86_400_000),
      );
      assert.equal(
        imported.orders.filter((order) => order.businessDayKey === key).length,
        daysAgo === 1 ? 2 : 1,
      );
    }
    for (const order of imported.orders) {
      assert.ok(Date.parse(order.openedAt) <= now.getTime());
      assert.equal(
        order.totalCents,
        order.lines.reduce(
          (sum, line) => sum + line.priceCents * line.quantity,
          0,
        ),
      );
    }
  }
});

it("preserves existing records, photos and settings, skips imported samples and avoids sequence collisions", () => {
  const now = new Date("2026-10-15T04:00:00Z");
  const seed = createSampleBackup(now, exportBackup(emptyDocument()));
  const existing = {
    ...emptyDocument(),
    groupingSettings: { enabled: true, names: ["家用"] },
    orders: [
      {
        ...seed.orders[3],
        id: "user-record",
        seq: 8,
        photos: [
          {
            id: "photo",
            dataUrl: "data:image/png;base64,YQ==",
            createdAt: now.toISOString(),
          },
        ],
      },
    ],
  };
  const imported = mergeBackup(
    existing,
    createSampleBackup(now, exportBackup(existing)),
  );
  assert.deepEqual(
    imported.orders.find((order) => order.id === "user-record"),
    existing.orders[0],
  );
  assert.deepEqual(imported.groupingSettings, existing.groupingSettings);
  assert.equal(
    imported.orders.find((order) => order.id === seed.orders[3].id)?.seq,
    9,
  );
  imported.dishes[0].name = "自定义咖啡";
  const repeated = createSampleBackup(now, exportBackup(imported));
  assert.equal(repeated.dishes.length, 0);
  assert.equal(repeated.orders.length, 0);
  assert.deepEqual(mergeBackup(imported, repeated), imported);
});
