import Dexie from "dexie";
import {
  addTag as addTagDocument,
  deleteDish as deleteDishDocument,
  deleteOrder as deleteOrderDocument,
  deleteTag as deleteTagDocument,
  emptyDocument,
  exportBackup as exportBackupDocument,
  listAllOrders as listAllOrdersDocument,
  listCategories as listCategoriesDocument,
  listDishes as listDishesDocument,
  listOrders as listOrdersDocument,
  listTags as listTagsDocument,
  mergeBackup,
  saveCategory as saveCategoryDocument,
  saveDish as saveDishDocument,
  saveOrder as saveOrderDocument,
} from "./document";
import { type BbqStore, BbqStoreError } from "./store";
import type { Category, Dish, ItemTag, Order, OrderPhoto } from "./types";

type StoredDish = Omit<Dish, "unit"> & { unit?: string };
type StoredOrder = Omit<Order, "lines" | "photos"> & {
  lines: Array<Omit<Order["lines"][number], "unit"> & { unit?: string }>;
  photos?: OrderPhoto[];
};

const db = new Dexie("bbq");

db.version(1).stores({
  categories: "id, sort, name",
  dishes: "id, categoryId, sort, name",
  orders: "id, businessDayKey, status, openedAt, seat",
});

db.version(2).stores({ tags: "id, name" });

const tagsTable = db.table<ItemTag, string>("tags");
const categoriesTable = db.table<Category, string>("categories");
const dishesTable = db.table<StoredDish, string>("dishes");
const ordersTable = db.table<StoredOrder, string>("orders");

function createId(): string {
  return crypto.randomUUID();
}

function normalizeDish(dish: StoredDish): Dish {
  return { ...dish, unit: dish.unit?.trim() || "份" };
}

function normalizeOrder(order: StoredOrder): Order {
  return {
    ...order,
    photos: order.photos ?? [],
    lines: order.lines.map((line) => ({
      ...line,
      unit: line.unit?.trim() || "份",
    })),
  };
}

async function readDocument() {
  const [categories, storedDishes, storedOrders, tags] = await Promise.all([
    categoriesTable.toArray(),
    dishesTable.toArray(),
    ordersTable.toArray(),
    tagsTable.toArray(),
  ]);
  const dishes = storedDishes.map(normalizeDish);
  const orders = storedOrders.map(normalizeOrder);
  return { categories, dishes, orders, tags };
}

async function guard<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof BbqStoreError) throw error;
    throw new BbqStoreError("storage_failed");
  }
}

export function createIdbStore(): BbqStore {
  return {
    listTags() {
      return guard(async () =>
        listTagsDocument({ tags: await tagsTable.toArray() }),
      );
    },
    addTag(name) {
      return guard(() =>
        db.transaction("rw", db.tables, async () => {
          const saved = addTagDocument(await readDocument(), name, createId);
          await tagsTable.put(saved.tag);
          return saved.tag;
        }),
      );
    },
    deleteTag(id) {
      return guard(() =>
        db.transaction("rw", db.tables, async () => {
          deleteTagDocument(await readDocument(), id);
          await tagsTable.delete(id);
        }),
      );
    },
    listCategories() {
      // 页面查询只读需要的表；完整文档仍供写入校验和备份使用。
      return guard(async () =>
        listCategoriesDocument({
          ...emptyDocument(),
          categories: await categoriesTable.toArray(),
        }),
      );
    },
    saveCategory(input) {
      return guard(async () => {
        const saved = saveCategoryDocument(
          await readDocument(),
          input,
          createId,
        );
        await categoriesTable.put(saved.category);
        return saved.category;
      });
    },
    listDishes() {
      return guard(async () =>
        listDishesDocument({
          ...emptyDocument(),
          dishes: (await dishesTable.toArray()).map(normalizeDish),
        }),
      );
    },
    saveDish(input) {
      return guard(() =>
        db.transaction("rw", db.tables, async () => {
          const saved = saveDishDocument(await readDocument(), input, createId);
          if (saved.document.tags?.length)
            await tagsTable.bulkPut(saved.document.tags);
          await dishesTable.put(saved.dish);
          return saved.dish;
        }),
      );
    },
    deleteDish(id) {
      return guard(async () => {
        deleteDishDocument(await readDocument(), id);
        await dishesTable.delete(id);
      });
    },
    listOrders(businessDayKey) {
      return guard(async () =>
        listOrdersDocument(
          {
            ...emptyDocument(),
            orders: (
              await ordersTable
                .where("businessDayKey")
                .equals(businessDayKey)
                .toArray()
            ).map(normalizeOrder),
          },
          businessDayKey,
        ),
      );
    },
    listAllOrders() {
      return guard(async () =>
        listAllOrdersDocument({
          ...emptyDocument(),
          orders: (await ordersTable.toArray()).map(normalizeOrder),
        }),
      );
    },
    getOrder(id) {
      return guard(async () => {
        const order = await ordersTable.get(id);
        return order ? normalizeOrder(order) : null;
      });
    },
    saveOrder(input) {
      return guard(() =>
        db.transaction("rw", db.tables, async () => {
          const saved = saveOrderDocument(await readDocument(), input, {
            now: new Date(),
            createId,
          });
          await ordersTable.put(saved.order);
          return saved.order;
        }),
      );
    },
    deleteOrder(id) {
      return guard(async () => {
        deleteOrderDocument(await readDocument(), id);
        await ordersTable.delete(id);
      });
    },
    exportBackup(options) {
      return guard(() =>
        db.transaction("r", db.tables, async () =>
          exportBackupDocument(await readDocument(), options),
        ),
      );
    },
    importBackup(backup) {
      return guard(() =>
        db.transaction("rw", db.tables, async () => {
          const next = mergeBackup(await readDocument(), backup);
          const tagIds = new Set(backup.tags?.map((item) => item.id));
          const categoryIds = new Set(backup.categories.map((item) => item.id));
          const dishIds = new Set(backup.dishes.map((item) => item.id));
          const orderIds = new Set(backup.orders.map((item) => item.id));
          const tags = (next.tags ?? []).filter((item) => tagIds.has(item.id));
          const categories = next.categories.filter((item) =>
            categoryIds.has(item.id),
          );
          const dishes = next.dishes.filter((item) => dishIds.has(item.id));
          const orders = next.orders.filter((item) => orderIds.has(item.id));
          if (tags.length) await tagsTable.bulkPut(tags);
          if (categories.length) await categoriesTable.bulkPut(categories);
          if (dishes.length) await dishesTable.bulkPut(dishes);
          if (orders.length) await ordersTable.bulkPut(orders);
        }),
      );
    },
  };
}

export const bbqStore: BbqStore = createIdbStore();
