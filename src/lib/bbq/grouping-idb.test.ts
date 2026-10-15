import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import Dexie, { liveQuery } from "dexie";
import { bbqStore, createIdbStore } from "./idb-store";

before(async () => {
  const legacy = new Dexie("bbq");
  legacy.version(1).stores({
    categories: "id, sort, name",
    dishes: "id, categoryId, sort, name",
    orders: "id, businessDayKey, status, openedAt, seat",
  });
  legacy.version(2).stores({ tags: "id, name" });
  await legacy.table("orders").put({
    id: "legacy",
    businessDayKey: "2026-10-15",
    seq: 1,
    seat: 2,
    status: "open",
    openedAt: "2026-10-15T02:00:00.000Z",
    lines: [],
    totalCents: 0,
  });
  legacy.close();
});

describe("grouping preferences persistence", () => {
  it("upgrades the existing database without seeding options or changing old orders", async () => {
    assert.deepEqual(await bbqStore.getGroupingSettings(), {
      enabled: false,
      names: [],
    });
    const order = await bbqStore.getOrder("legacy");
    assert.equal(order?.seat, 2);
    assert.equal(order?.groupName, undefined);
    assert.deepEqual(order?.photos, []);
  });

  it("persists settings across store instances and keeps snapshots after disabling", async () => {
    await bbqStore.saveGroupingSettings({
      enabled: true,
      names: ["客户&朋友"],
    });
    assert.deepEqual(await createIdbStore().getGroupingSettings(), {
      enabled: true,
      names: ["客户&朋友"],
    });
    await bbqStore.saveOrder({
      id: "legacy",
      seat: 2,
      status: "open",
      lines: [],
      groupingEnabled: true,
      groupName: "客户&朋友",
    });
    await bbqStore.saveGroupingSettings({ enabled: false, names: [] });
    const changed = await bbqStore.saveOrder({
      id: "legacy",
      seat: null,
      status: "done",
      lines: [],
    });
    assert.equal(changed.groupName, "客户&朋友");
    assert.equal(changed.groupingEnabled, true);
  });

  it(
    "notifies mounted views when settings change",
    { timeout: 3000 },
    async () => {
      await new Promise<void>((resolve, reject) => {
        let changed = false;
        const subscription = liveQuery(() =>
          bbqStore.getGroupingSettings(),
        ).subscribe({
          next(settings) {
            if (settings.enabled && settings.names.includes("实时")) {
              subscription.unsubscribe();
              resolve();
            } else if (!changed) {
              changed = true;
              void bbqStore
                .saveGroupingSettings({ enabled: true, names: ["实时"] })
                .catch(reject);
            }
          },
          error: reject,
        });
      });
    },
  );

  it("exports and imports settings atomically and accepts old backups", async () => {
    const backup = await bbqStore.exportBackup({ includePhotos: true });
    assert.deepEqual(backup.groupingSettings, {
      enabled: true,
      names: ["实时"],
    });
    assert.equal(backup.orders[0]?.groupName, "客户&朋友");
    await bbqStore.saveGroupingSettings({ enabled: false, names: [] });
    await bbqStore.importBackup(backup);
    assert.deepEqual(
      await bbqStore.getGroupingSettings(),
      backup.groupingSettings,
    );
    const { groupingSettings: _settings, ...oldBackup } = backup;
    await bbqStore.importBackup(oldBackup);
    assert.deepEqual(
      await bbqStore.getGroupingSettings(),
      backup.groupingSettings,
    );
    await assert.rejects(
      bbqStore.importBackup({
        ...backup,
        groupingSettings: { enabled: true, names: ["字".repeat(11)] },
      }),
    );
    assert.deepEqual(
      await bbqStore.getGroupingSettings(),
      backup.groupingSettings,
    );
  });
});
