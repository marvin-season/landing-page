import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  type BbqDocument,
  type DocumentClock,
  deleteDish,
  emptyDocument,
  exportBackup,
  getOrder,
  listAllOrders,
  listOrders,
  mergeBackup,
  saveCategory,
  saveDish,
  saveOrder,
} from "./document";
import { BbqStoreError } from "./store";
import type { Category, Dish, Order, OrderLine } from "./types";

function createIds(): () => string {
  let next = 0;
  return () => {
    next += 1;
    return `id-${next}`;
  };
}

function openShop(now = new Date("2026-10-10T07:00:00.000Z")) {
  const createId = createIds();
  const clock: DocumentClock = { now, createId };
  let document = emptyDocument();
  const categorySaved = saveCategory(
    document,
    { name: "烤串", sort: 0, listed: true },
    createId,
  );
  document = categorySaved.document;
  const dishSaved = saveDish(
    document,
    {
      categoryId: categorySaved.category.id,
      name: "羊肉串",
      priceCents: 500,
      unit: "串",
      sort: 0,
      listed: true,
    },
    createId,
  );
  return {
    document: dishSaved.document,
    category: categorySaved.category,
    dish: dishSaved.dish,
    createId,
    clock,
  };
}

function lineInput(dish: Dish, quantity = 1) {
  return {
    dishId: dish.id,
    name: "伪造",
    priceCents: 1,
    unit: "伪造单位",
    quantity,
  };
}

describe("document", () => {
  it("opens an order whose total is the sum of its lines", () => {
    const shop = openShop();
    const saved = saveOrder(
      shop.document,
      {
        seat: 2,
        status: "open",
        lines: [lineInput(shop.dish, 2), lineInput(shop.dish, 1)],
      },
      shop.clock,
    );
    assert.equal(saved.order.lines[0]?.priceCents, 500);
    assert.equal(saved.order.lines[0]?.name, "羊肉串");
    assert.equal(saved.order.lines[0]?.lineCents, 1000);
    assert.equal(saved.order.lines[1]?.lineCents, 500);
    assert.equal(saved.order.totalCents, 1500);
    assert.equal(exportBackup(saved.document).version, 1);
  });

  it("omits photos from backups by default and includes them on request", () => {
    const shop = openShop();
    const photo = {
      id: "photo-1",
      dataUrl: "data:image/jpeg;base64,cGhvdG8=",
      createdAt: "2026-10-10T07:05:00.000Z",
    };
    const saved = saveOrder(
      shop.document,
      {
        seat: 1,
        status: "open",
        lines: [lineInput(shop.dish)],
        photos: [photo],
      },
      shop.clock,
    );

    assert.deepEqual(exportBackup(saved.document).orders[0]?.photos, []);
    assert.deepEqual(
      exportBackup(saved.document, { includePhotos: true }).orders[0]?.photos,
      [photo],
    );
    assert.deepEqual(saved.order.photos, [photo]);
  });

  it("rejects a dish with an empty unit", () => {
    const shop = openShop();
    assert.throws(
      () =>
        saveDish(
          shop.document,
          {
            categoryId: shop.category.id,
            name: "鸡翅",
            priceCents: 600,
            unit: " ",
            sort: 0,
            listed: true,
          },
          shop.createId,
        ),
      (error: unknown) =>
        error instanceof BbqStoreError && error.code === "invalid_name",
    );
  });

  it("keeps copied units when a dish unit changes", () => {
    const shop = openShop();
    const opened = saveOrder(
      shop.document,
      { seat: 1, status: "open", lines: [lineInput(shop.dish)] },
      shop.clock,
    );
    assert.equal(opened.order.lines[0]?.unit, "串");

    const changed = saveDish(
      opened.document,
      {
        id: shop.dish.id,
        categoryId: shop.category.id,
        name: "羊肉串",
        priceCents: 500,
        unit: "把",
        sort: 0,
        listed: true,
      },
      shop.createId,
    );
    assert.equal(
      getOrder(changed.document, opened.order.id)?.lines[0]?.unit,
      "串",
    );
    const next = saveOrder(
      changed.document,
      { seat: 2, status: "open", lines: [lineInput(changed.dish)] },
      shop.clock,
    );
    assert.equal(next.order.lines[0]?.unit, "把");
  });

  it("keeps copied prices when a dish is repriced", () => {
    const shop = openShop();
    const opened = saveOrder(
      shop.document,
      { seat: 1, status: "open", lines: [lineInput(shop.dish)] },
      shop.clock,
    );
    const repriced = saveDish(
      opened.document,
      {
        id: shop.dish.id,
        categoryId: shop.category.id,
        name: "羊肉串",
        priceCents: 800,
        unit: "串",
        sort: 0,
        listed: true,
      },
      shop.createId,
    );
    const previous = getOrder(repriced.document, opened.order.id);
    assert.equal(previous?.lines[0]?.priceCents, 500);
    const next = saveOrder(
      repriced.document,
      { seat: 3, status: "open", lines: [lineInput(repriced.dish)] },
      shop.clock,
    );
    assert.equal(next.order.lines[0]?.priceCents, 800);
    assert.equal(
      getOrder(next.document, opened.order.id)?.lines[0]?.priceCents,
      500,
    );
  });

  it("rejects a new line for an unlisted dish", () => {
    const shop = openShop();
    const unlisted = saveDish(
      shop.document,
      {
        id: shop.dish.id,
        categoryId: shop.category.id,
        name: "羊肉串",
        priceCents: 500,
        unit: "串",
        sort: 0,
        listed: false,
      },
      shop.createId,
    );
    assert.throws(
      () =>
        saveOrder(
          unlisted.document,
          { seat: 1, status: "open", lines: [lineInput(shop.dish)] },
          shop.clock,
        ),
      (error: unknown) =>
        error instanceof BbqStoreError && error.code === "dish_unavailable",
    );
    assert.equal(unlisted.document.orders.length, 0);
  });

  it("allows a listed dish even when its legacy category is unlisted", () => {
    const shop = openShop();
    const categoryHidden = saveCategory(
      shop.document,
      { ...shop.category, listed: false },
      shop.createId,
    );
    const saved = saveOrder(
      categoryHidden.document,
      { seat: 1, status: "open", lines: [lineInput(shop.dish)] },
      shop.clock,
    );
    assert.equal(saved.order.lines[0]?.dishId, shop.dish.id);
  });

  it("deletes a dish without changing historical order lines", () => {
    const shop = openShop();
    const opened = saveOrder(
      shop.document,
      { seat: 1, status: "open", lines: [lineInput(shop.dish)] },
      shop.clock,
    );
    const deleted = deleteDish(opened.document, shop.dish.id);

    assert.equal(
      deleted.dishes.some((dish) => dish.id === shop.dish.id),
      false,
    );
    assert.equal(getOrder(deleted, opened.order.id)?.lines[0]?.name, "羊肉串");
    assert.throws(
      () =>
        saveOrder(
          deleted,
          { seat: 2, status: "open", lines: [lineInput(shop.dish)] },
          shop.clock,
        ),
      (error: unknown) =>
        error instanceof BbqStoreError && error.code === "dish_unavailable",
    );
  });

  it("rejects deleting a missing dish", () => {
    const shop = openShop();
    assert.throws(
      () => deleteDish(shop.document, "missing"),
      (error: unknown) =>
        error instanceof BbqStoreError && error.code === "not_found",
    );
  });

  it("allows a takeaway order with no seat", () => {
    const shop = openShop();
    const saved = saveOrder(
      shop.document,
      { seat: null, status: "open", lines: [lineInput(shop.dish)] },
      shop.clock,
    );
    assert.equal(saved.order.seat, null);
  });

  it("rejects a seat outside 1 to 8", () => {
    const shop = openShop();
    assert.throws(
      () =>
        saveOrder(
          shop.document,
          {
            groupingEnabled: true,
            seat: 9,
            status: "open",
            lines: [lineInput(shop.dish)],
          },
          shop.clock,
        ),
      (error: unknown) =>
        error instanceof BbqStoreError && error.code === "invalid_seat",
    );
  });

  it("allows two open orders on the same seat", () => {
    const shop = openShop();
    const first = saveOrder(
      shop.document,
      {
        groupingEnabled: true,
        seat: 4,
        status: "open",
        lines: [lineInput(shop.dish)],
      },
      shop.clock,
    );
    const second = saveOrder(
      first.document,
      {
        groupingEnabled: true,
        seat: 4,
        status: "open",
        lines: [lineInput(shop.dish)],
      },
      shop.clock,
    );
    assert.equal(first.order.seq, 1);
    assert.equal(second.order.seq, 2);
    assert.equal(first.order.status, "open");
    assert.equal(second.order.status, "open");
    assert.notEqual(first.order.id, second.order.id);
  });

  it("recalculates the total from lines when quantity changes", () => {
    const shop = openShop();
    const opened = saveOrder(
      shop.document,
      { seat: 1, status: "open", lines: [lineInput(shop.dish, 1)] },
      shop.clock,
    );
    const line = opened.order.lines[0];
    assert.ok(line);
    const updated = saveOrder(
      opened.document,
      {
        id: opened.order.id,
        seat: 1,
        status: "done",
        lines: [
          {
            id: line.id,
            dishId: shop.dish.id,
            name: "改掉的名字",
            priceCents: 1,
            unit: "改掉的单位",
            quantity: 4,
          },
        ],
      },
      { ...shop.clock, now: new Date("2026-10-11T04:00:00.000Z") },
    );
    assert.equal(updated.order.lines[0]?.name, "羊肉串");
    assert.equal(updated.order.lines[0]?.priceCents, 500);
    assert.equal(updated.order.lines[0]?.quantity, 4);
    assert.equal(updated.order.totalCents, 2000);
    assert.equal(updated.order.status, "done");
    assert.equal(updated.order.openedAt, opened.order.openedAt);
    assert.equal(updated.order.businessDayKey, opened.order.businessDayKey);
  });

  it("keeps order photos when an update omits the photo field", () => {
    const shop = openShop();
    const photo = {
      id: "photo-1",
      dataUrl: "data:image/jpeg;base64,cGhvdG8=",
      createdAt: "2026-10-10T04:00:00.000Z",
    };
    const opened = saveOrder(
      shop.document,
      {
        seat: 1,
        status: "open",
        photos: [photo],
        lines: [lineInput(shop.dish)],
      },
      shop.clock,
    );
    const line = opened.order.lines[0];
    assert.ok(line);

    const updated = saveOrder(
      opened.document,
      {
        id: opened.order.id,
        seat: 1,
        status: "done",
        lines: [
          {
            id: line.id,
            dishId: line.dishId,
            name: line.name,
            priceCents: line.priceCents,
            unit: line.unit,
            quantity: line.quantity,
          },
        ],
      },
      shop.clock,
    );

    assert.deepEqual(updated.order.photos, [photo]);
  });

  it("lists open orders before done orders and newer orders first", () => {
    const shop = openShop();
    let document = shop.document;
    const openedAt = [
      "2026-10-10T07:00:00.000Z",
      "2026-10-10T09:00:00.000Z",
      "2026-10-10T08:00:00.000Z",
      "2026-10-10T11:00:00.000Z",
    ];
    const statuses = ["open", "open", "done", "done"] as const;
    for (let index = 0; index < openedAt.length; index += 1) {
      const saved = saveOrder(
        document,
        {
          seat: 1,
          status: statuses[index] ?? "open",
          openedAt: openedAt[index],
          lines: [lineInput(shop.dish)],
        },
        shop.clock,
      );
      document = saved.document;
    }
    const listed = listOrders(document, "2026-10-10").map(
      (order) => `${order.status}:${order.openedAt}`,
    );
    assert.deepEqual(listed, [
      "open:2026-10-10T09:00:00.000Z",
      "open:2026-10-10T07:00:00.000Z",
      "done:2026-10-10T11:00:00.000Z",
      "done:2026-10-10T08:00:00.000Z",
    ]);
  });

  it("files a 02:30 Shanghai order on the previous business day", () => {
    const shop = openShop(new Date("2026-10-09T18:30:00.000Z"));
    const saved = saveOrder(
      shop.document,
      { seat: 1, status: "open", lines: [lineInput(shop.dish)] },
      shop.clock,
    );
    assert.equal(saved.order.businessDayKey, "2026-10-09");
  });

  it("lists all orders from newest to oldest", () => {
    const document = sampleDocument();
    assert.deepEqual(
      listAllOrders(document).map((order) => order.id),
      ["o-local", "o1"],
    );
  });

  it("merges backups by id and recalculates order totals", () => {
    const current = sampleDocument();
    const merged = mergeBackup(current, sampleBackup());
    assert.equal(
      merged.categories.find((item) => item.id === "c1")?.name,
      "新菜系",
    );
    assert.equal(
      merged.categories.find((item) => item.id === "c-local")?.name,
      "本机菜系",
    );
    assert.equal(
      merged.categories.some((item) => item.id === "c-new"),
      true,
    );
    assert.equal(
      merged.dishes.find((item) => item.id === "d1")?.priceCents,
      300,
    );
    assert.equal(
      merged.dishes.find((item) => item.id === "d-local")?.name,
      "本机菜",
    );
    assert.equal(
      merged.dishes.some((item) => item.id === "d-new"),
      true,
    );
    const order = merged.orders.find((item) => item.id === "o1");
    assert.equal(order?.seat, 4);
    assert.equal(order?.status, "done");
    assert.equal(order?.openedAt, "2026-10-10T06:00:00.000Z");
    assert.equal(order?.businessDayKey, "2026-10-10");
    assert.equal(order?.seq, 9);
    assert.deepEqual(order?.photos, [
      {
        id: "photo-local",
        dataUrl: "data:image/jpeg;base64,bG9jYWw=",
        createdAt: "2026-10-09T04:05:00.000Z",
      },
    ]);
    assert.deepEqual(
      order?.lines.map((line) => line.id),
      ["l1", "l-local", "l-new"],
    );
    assert.equal(order?.lines.find((line) => line.id === "l1")?.name, "替换行");
    assert.equal(
      order?.lines.find((line) => line.id === "l-local")?.lineCents,
      400,
    );
    assert.equal(order?.totalCents, 2300);
    assert.equal(merged.orders.find((item) => item.id === "o-local")?.seat, 2);
    assert.equal(
      merged.orders.find((item) => item.id === "o-new")?.totalCents,
      100,
    );
    assert.equal(
      merged.orders.find((item) => item.id === "o-takeaway")?.seat,
      null,
    );
  });

  it("leaves the current document unchanged when a backup is invalid", () => {
    const current = sampleDocument();
    const snapshot = structuredClone(current);
    const backup = sampleBackup();
    const invalid = [
      { ...backup, version: 2 },
      { version: 1, categories: {}, dishes: [], orders: [] },
      {
        ...backup,
        categories: [
          backup.categories[0],
          { ...backup.categories[0], name: "重复" },
        ],
      },
      {
        ...backup,
        orders: [
          {
            ...backup.orders[0],
            lines: [
              {
                ...backup.orders[0]?.lines[0],
                lineCents: 1,
              },
            ],
          },
        ],
      },
      {
        ...backup,
        dishes: [
          {
            id: "d-no-unit",
            categoryId: "c1",
            name: "没有单位",
            priceCents: 100,
            sort: 0,
            listed: true,
          },
        ],
      },
      {
        ...backup,
        dishes: [
          {
            id: "d-missing",
            categoryId: "missing",
            name: "没有菜系",
            priceCents: 100,
            unit: "份",
            sort: 0,
            listed: true,
          },
        ],
      },
      {
        ...backup,
        orders: [
          {
            ...backup.orders[0],
            photos: [
              {
                id: "photo-invalid",
                dataUrl: "https://example.com/photo.jpg",
                createdAt: "2026-10-10T06:05:00.000Z",
              },
            ],
          },
        ],
      },
    ];
    for (const item of invalid) {
      assert.throws(
        () => mergeBackup(current, item),
        (error: unknown) =>
          error instanceof BbqStoreError && error.code === "invalid_backup",
      );
    }
    assert.deepEqual(current, snapshot);
  });
});

function sampleLine(
  id: string,
  name: string,
  priceCents: number,
  quantity: number,
): OrderLine {
  return {
    id,
    dishId: "d1",
    name,
    priceCents,
    unit: "份",
    quantity,
    lineCents: priceCents * quantity,
  };
}

function sampleDocument(): BbqDocument {
  const categories: Category[] = [
    { id: "c1", name: "旧菜系", sort: 0, listed: true },
    { id: "c-local", name: "本机菜系", sort: 1, listed: true },
  ];
  const dishes: Dish[] = [
    {
      id: "d1",
      categoryId: "c1",
      name: "旧菜",
      priceCents: 100,
      unit: "份",
      sort: 0,
      listed: true,
    },
    {
      id: "d-local",
      categoryId: "c-local",
      name: "本机菜",
      priceCents: 200,
      unit: "份",
      sort: 0,
      listed: true,
    },
  ];
  const orders: Order[] = [
    {
      id: "o1",
      businessDayKey: "2026-10-09",
      seq: 1,
      seat: 1,
      status: "open",
      openedAt: "2026-10-09T04:00:00.000Z",
      lines: [
        sampleLine("l1", "旧菜", 100, 1),
        sampleLine("l-local", "本机行", 200, 2),
      ],
      photos: [
        {
          id: "photo-local",
          dataUrl: "data:image/jpeg;base64,bG9jYWw=",
          createdAt: "2026-10-09T04:05:00.000Z",
        },
      ],
      totalCents: 500,
    },
    {
      id: "o-local",
      businessDayKey: "2026-10-09",
      seq: 2,
      seat: 2,
      status: "done",
      openedAt: "2026-10-09T05:00:00.000Z",
      lines: [sampleLine("l-order-local", "本机菜", 200, 1)],
      photos: [],
      totalCents: 200,
    },
  ];
  return { categories, dishes, orders };
}

function sampleBackup() {
  return {
    version: 1 as const,
    categories: [
      { id: "c1", name: "新菜系", sort: 3, listed: false },
      { id: "c-new", name: "新加菜系", sort: 0, listed: true },
    ],
    dishes: [
      {
        id: "d1",
        categoryId: "c1",
        name: "新菜",
        priceCents: 300,
        unit: "份",
        sort: 1,
        listed: true,
      },
      {
        id: "d-new",
        categoryId: "c-new",
        name: "新加菜",
        priceCents: 400,
        unit: "份",
        sort: 0,
        listed: true,
      },
    ],
    orders: [
      {
        id: "o1",
        businessDayKey: "2026-10-10",
        seq: 9,
        seat: 4,
        status: "done" as const,
        openedAt: "2026-10-10T06:00:00.000Z",
        lines: [
          sampleLine("l1", "替换行", 800, 2),
          sampleLine("l-new", "追加行", 100, 3),
        ],
        totalCents: 1,
      },
      {
        id: "o-new",
        businessDayKey: "2026-10-10",
        seq: 1,
        seat: 5,
        status: "open" as const,
        openedAt: "2026-10-10T07:00:00.000Z",
        lines: [sampleLine("l-order-new", "整单", 50, 2)],
        totalCents: 999,
      },
      {
        id: "o-takeaway",
        businessDayKey: "2026-10-10",
        seq: 2,
        seat: null,
        status: "open" as const,
        openedAt: "2026-10-10T07:30:00.000Z",
        lines: [sampleLine("l-takeaway", "打包", 200, 1)],
        totalCents: 200,
      },
    ],
  };
}

describe("calorie snapshots and backups", () => {
  it("snapshots menu calories and keeps them after menu edits, status and quantity changes", () => {
    const shop = openShop();
    const menu = saveDish(
      shop.document,
      { ...shop.dish, caloriesKcal: 120.5 },
      shop.createId,
    );
    const opened = saveOrder(
      menu.document,
      {
        seat: null,
        status: "open",
        lines: [{ ...lineInput(menu.dish, 2), caloriesKcal: 999 }],
      },
      shop.clock,
    );
    assert.equal(opened.order.lines[0].caloriesKcal, 120.5);
    const changed = saveDish(
      opened.document,
      { ...menu.dish, caloriesKcal: 250 },
      shop.createId,
    );
    const saved = saveOrder(
      changed.document,
      {
        id: opened.order.id,
        seat: null,
        status: "done",
        lines: [{ ...opened.order.lines[0], quantity: 3, caloriesKcal: 999 }],
      },
      shop.clock,
    );
    assert.equal(saved.order.lines[0].caloriesKcal, 120.5);
    assert.equal(saved.order.lines[0].quantity, 3);
    assert.equal(saved.order.totalCents, 1500);
    const restored = mergeBackup(emptyDocument(), exportBackup(saved.document));
    assert.equal(restored.dishes[0].caloriesKcal, 250);
    assert.equal(restored.orders[0].lines[0].caloriesKcal, 120.5);
  });

  it("imports legacy backups without assigning current menu calories to historical lines", () => {
    const shop = openShop();
    const saved = saveOrder(
      shop.document,
      { seat: null, status: "done", lines: [lineInput(shop.dish)] },
      shop.clock,
    );
    const backup = exportBackup(saved.document);
    delete backup.dishes[0].caloriesKcal;
    delete backup.orders[0].lines[0].caloriesKcal;
    const restored = mergeBackup(emptyDocument(), backup);
    assert.equal(restored.dishes[0].caloriesKcal, null);
    assert.equal(restored.orders[0].lines[0].caloriesKcal, null);
    const changed = saveDish(
      restored,
      { ...restored.dishes[0], caloriesKcal: 100 },
      shop.createId,
    );
    const updated = saveOrder(
      changed.document,
      {
        id: saved.order.id,
        seat: null,
        status: "open",
        lines: saved.order.lines,
      },
      shop.clock,
    );
    assert.equal(updated.order.lines[0].caloriesKcal, null);
  });

  it("preserves zero calorie values and rejects malformed calorie backups before merging", () => {
    const shop = openShop();
    const menu = saveDish(
      shop.document,
      { ...shop.dish, caloriesKcal: 0 },
      shop.createId,
    );
    const saved = saveOrder(
      menu.document,
      { seat: null, status: "done", lines: [lineInput(menu.dish)] },
      shop.clock,
    );
    const backup = exportBackup(saved.document);
    const restored = mergeBackup(emptyDocument(), backup);
    assert.equal(restored.dishes[0].caloriesKcal, 0);
    assert.equal(restored.orders[0].lines[0].caloriesKcal, 0);
    for (const invalid of [
      -1,
      "120",
      Number.NaN,
      Number.POSITIVE_INFINITY,
      {},
    ]) {
      const invalidDish = structuredClone(backup);
      Object.assign(invalidDish.dishes[0], { caloriesKcal: invalid });
      assert.throws(
        () => mergeBackup(emptyDocument(), invalidDish),
        /invalid_backup/,
      );
      const invalidLine = structuredClone(backup);
      Object.assign(invalidLine.orders[0].lines[0], { caloriesKcal: invalid });
      assert.throws(
        () => mergeBackup(emptyDocument(), invalidLine),
        /invalid_backup/,
      );
    }
    assert.throws(
      () =>
        saveDish(
          shop.document,
          { ...shop.dish, caloriesKcal: -1 },
          shop.createId,
        ),
      /invalid_calories/,
    );
  });
});

describe("order grouping switch", () => {
  it("defaults new records to ungrouped even if a stale seat is supplied", () => {
    const shop = openShop();
    const saved = saveOrder(
      shop.document,
      { seat: 7, status: "open", lines: [lineInput(shop.dish)] },
      shop.clock,
    );
    assert.equal(saved.order.groupingEnabled, false);
    assert.equal(saved.order.seat, null);
  });

  it("allows seat or takeaway when enabled and clears the seat when disabled", () => {
    const shop = openShop();
    const saved = saveOrder(
      shop.document,
      {
        groupingEnabled: true,
        seat: 2,
        status: "open",
        lines: [lineInput(shop.dish)],
      },
      shop.clock,
    );
    assert.equal(saved.order.seat, 2);
    const takeaway = saveOrder(
      saved.document,
      {
        id: saved.order.id,
        groupingEnabled: true,
        seat: null,
        status: "open",
        lines: saved.order.lines,
      },
      shop.clock,
    );
    assert.equal(takeaway.order.groupingEnabled, true);
    assert.equal(takeaway.order.seat, null);
    const disabled = saveOrder(
      saved.document,
      {
        id: saved.order.id,
        groupingEnabled: false,
        seat: 2,
        status: "done",
        lines: saved.order.lines,
      },
      shop.clock,
    );
    assert.equal(disabled.order.groupingEnabled, false);
    assert.equal(disabled.order.seat, null);
    const enabledAgain = saveOrder(
      disabled.document,
      {
        id: saved.order.id,
        groupingEnabled: true,
        seat: 5,
        status: "open",
        lines: [],
      },
      shop.clock,
    );
    assert.equal(enabledAgain.order.groupingEnabled, true);
    assert.equal(enabledAgain.order.seat, 5);
  });

  it("preserves the switch on status updates and edits of legacy orders", () => {
    const shop = openShop();
    for (const groupingEnabled of [true, false]) {
      const saved = saveOrder(
        shop.document,
        {
          groupingEnabled,
          seat: 3,
          status: "open",
          lines: [lineInput(shop.dish)],
        },
        shop.clock,
      );
      const changed = saveOrder(
        saved.document,
        {
          id: saved.order.id,
          seat: saved.order.seat,
          status: "done",
          lines: saved.order.lines,
        },
        shop.clock,
      );
      assert.equal(changed.order.groupingEnabled, groupingEnabled);
      assert.equal(changed.order.seat, groupingEnabled ? 3 : null);
    }
    const legacy = saveOrder(
      shop.document,
      {
        groupingEnabled: true,
        seat: 4,
        status: "open",
        lines: [lineInput(shop.dish)],
      },
      shop.clock,
    );
    delete legacy.order.groupingEnabled;
    const updated = saveOrder(
      legacy.document,
      {
        id: legacy.order.id,
        seat: 4,
        status: "done",
        lines: legacy.order.lines,
      },
      shop.clock,
    );
    assert.equal(updated.order.groupingEnabled, true);
    assert.equal(updated.order.seat, 4);
  });

  it("round-trips both modes and merges the switch without deriving it from items", () => {
    const shop = openShop();
    for (const groupingEnabled of [true, false]) {
      const saved = saveOrder(
        shop.document,
        {
          groupingEnabled,
          seat: 6,
          status: "done",
          lines: [lineInput(shop.dish)],
        },
        shop.clock,
      );
      const backup = exportBackup(saved.document);
      const restored = mergeBackup(emptyDocument(), backup);
      assert.equal(restored.orders[0].groupingEnabled, groupingEnabled);
      assert.equal(restored.orders[0].seat, groupingEnabled ? 6 : null);
      const merged = mergeBackup(
        {
          ...saved.document,
          orders: [{ ...saved.order, groupingEnabled: !groupingEnabled }],
        },
        backup,
      );
      assert.equal(merged.orders[0].groupingEnabled, groupingEnabled);
    }
  });

  it("accepts old backups and rejects nonboolean grouping flags", () => {
    const shop = openShop();
    const saved = saveOrder(
      shop.document,
      {
        groupingEnabled: true,
        seat: 1,
        status: "open",
        lines: [lineInput(shop.dish)],
      },
      shop.clock,
    );
    const legacy = exportBackup(structuredClone(saved.document));
    delete legacy.orders[0].groupingEnabled;
    const restored = mergeBackup(emptyDocument(), legacy);
    assert.equal(restored.orders[0].groupingEnabled, true);
    assert.equal(restored.orders[0].seat, 1);
    for (const value of [null, 1, "false", {}]) {
      const backup = exportBackup(structuredClone(saved.document));
      Object.assign(backup.orders[0], { groupingEnabled: value });
      assert.throws(
        () => mergeBackup(emptyDocument(), backup),
        /invalid_backup/,
      );
    }
  });
});
