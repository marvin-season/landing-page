import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it, mock } from "node:test";
import Dexie from "dexie";
import { bbqStore } from "./idb-store";
import type { Order } from "./types";

// Exercise real Dexie queries against an isolated in-memory IndexedDB.
const seedDb = new Dexie("bbq");
const day = "2026-10-15";
const photo = {
  id: "photo",
  dataUrl: "data:image/jpeg;base64,YQ==",
  createdAt: "2026-10-15T02:00:00.000Z",
};
const order: Order = {
  id: "today",
  seq: 1,
  businessDayKey: day,
  seat: null,
  status: "open",
  openedAt: "2026-10-15T02:00:00.000Z",
  totalCents: 100,
  photos: [photo],
  lines: [
    {
      id: "line",
      dishId: "dish",
      name: "早餐",
      priceCents: 100,
      unit: "份",
      quantity: 1,
      lineCents: 100,
    },
  ],
};

before(async () => {
  // Open the schema through the application's store, then seed legacy rows too.
  await bbqStore.listTags();
  await seedDb.open();
  await seedDb.table("tags").put({ id: "tag", name: "餐饮" });
  await seedDb.table("categories").bulkPut([
    { id: "category", name: "菜单", sort: 0, listed: true },
    { id: "first", name: "优先", sort: -1, listed: true },
  ]);
  await seedDb.table("dishes").bulkPut([
    {
      id: "dish",
      categoryId: "category",
      name: "早餐",
      priceCents: 100,
      sort: 0,
      listed: true,
    },
    {
      id: "higher",
      categoryId: "category",
      name: "咖啡",
      priceCents: 200,
      unit: " 杯 ",
      sort: 10,
      listed: true,
    },
  ]);
  await seedDb.table("orders").bulkPut([
    order,
    { ...order, id: "done", seq: 2, status: "done" },
    {
      ...order,
      id: "old",
      businessDayKey: "2026-10-14",
      openedAt: "2026-10-14T02:00:00.000Z",
      photos: undefined,
      lines: [{ ...order.lines[0], unit: undefined }],
    },
  ]);
});

beforeEach(() => mock.restoreAll());
after(() => {
  mock.restoreAll();
  seedDb.close();
});

describe("targeted IndexedDB reads", () => {
  it("loads the menu without touching orders or photos and preserves sorting / legacy units", async () => {
    const reads: string[] = [];
    const original = IDBObjectStore.prototype.getAll;
    mock.method(
      IDBObjectStore.prototype,
      "getAll",
      function (this: IDBObjectStore, ...args: Parameters<typeof original>) {
        reads.push(this.name);
        assert.notEqual(
          this.name,
          "orders",
          "menu queries must never read orders",
        );
        return original.apply(this, args);
      },
    );
    const [categories, dishes, tags] = await Promise.all([
      bbqStore.listCategories(),
      bbqStore.listDishes(),
      bbqStore.listTags(),
    ]);
    assert.deepEqual(
      categories.map((item) => item.id),
      ["first", "category"],
    );
    assert.deepEqual(
      dishes.map((item) => [item.id, item.unit]),
      [
        ["higher", "杯"],
        ["dish", "份"],
      ],
    );
    assert.ok(tags.length > 0);
    assert.deepEqual(reads.toSorted(), ["categories", "dishes", "tags"]);
  });

  it("uses the date index and returns only that day's records in the existing order", async () => {
    const queries: string[] = [];
    const original = IDBIndex.prototype.getAll;
    mock.method(
      IDBIndex.prototype,
      "getAll",
      function (this: IDBIndex, ...args: Parameters<typeof original>) {
        queries.push(`${this.objectStore.name}.${this.name}`);
        return original.apply(this, args);
      },
    );
    const records = await bbqStore.listOrders(day);
    assert.deepEqual(
      records.map((item) => item.id),
      ["today", "done"],
    );
    assert.deepEqual(records[0]?.photos, [photo]);
    assert.deepEqual(queries, ["orders.businessDayKey"]);
    assert.deepEqual(await bbqStore.listOrders("2000-01-01"), []);
  });

  it("reads a single record by primary key and normalizes legacy fields", async () => {
    const requests: unknown[] = [];
    const original = IDBObjectStore.prototype.get;
    mock.method(
      IDBObjectStore.prototype,
      "get",
      function (this: IDBObjectStore, key: IDBValidKey | IDBKeyRange) {
        requests.push([this.name, key]);
        return original.call(this, key);
      },
    );
    const legacy = await bbqStore.getOrder("old");
    assert.equal(legacy?.lines[0]?.unit, "份");
    assert.deepEqual(legacy?.photos, []);
    assert.equal(await bbqStore.getOrder("missing"), null);
    assert.deepEqual(requests, [
      ["orders", "old"],
      ["orders", "missing"],
    ]);
  });

  it("reads all orders only when requested without loading menu tables", async () => {
    const reads: string[] = [];
    const original = IDBObjectStore.prototype.getAll;
    mock.method(
      IDBObjectStore.prototype,
      "getAll",
      function (this: IDBObjectStore, ...args: Parameters<typeof original>) {
        reads.push(this.name);
        return original.apply(this, args);
      },
    );
    assert.deepEqual(
      (await bbqStore.listAllOrders()).map((item) => item.id),
      ["done", "today", "old"],
    );
    assert.deepEqual(reads, ["orders"]);
  });

  it("keeps full-document save and backup semantics after targeted reads", async () => {
    const saved = await bbqStore.saveDish({
      id: "dish",
      categoryId: "category",
      name: "早餐更新",
      priceCents: 300,
      unit: "份",
      sort: 0,
      listed: true,
    });
    assert.equal(saved.priceCents, 300);
    assert.equal((await bbqStore.getOrder("today"))?.lines[0]?.priceCents, 100);
    const backup = await bbqStore.exportBackup({ includePhotos: true });
    assert.deepEqual(
      backup.orders.find((item) => item.id === "today")?.photos,
      [photo],
    );
    assert.ok(
      (await bbqStore.exportBackup()).orders.every(
        (item) => item.photos.length === 0,
      ),
    );
  });
});
