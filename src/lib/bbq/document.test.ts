import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  type BbqDocument,
  type DocumentClock,
  deleteDish,
  emptyDocument,
  exportBackup,
  getOrder,
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

function openShop(now = new Date("2026-10-10T04:00:00.000Z")) {
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

  it("allows two open orders on the same seat", () => {
    const shop = openShop();
    const first = saveOrder(
      shop.document,
      { seat: 4, status: "open", lines: [lineInput(shop.dish)] },
      shop.clock,
    );
    const second = saveOrder(
      first.document,
      { seat: 4, status: "open", lines: [lineInput(shop.dish)] },
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

  it("lists open orders before done orders and newer orders first", () => {
    const shop = openShop();
    let document = shop.document;
    const openedAt = [
      "2026-10-10T04:00:00.000Z",
      "2026-10-10T06:00:00.000Z",
      "2026-10-10T05:00:00.000Z",
      "2026-10-10T08:00:00.000Z",
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
      "open:2026-10-10T06:00:00.000Z",
      "open:2026-10-10T04:00:00.000Z",
      "done:2026-10-10T08:00:00.000Z",
      "done:2026-10-10T05:00:00.000Z",
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
    ],
  };
}
