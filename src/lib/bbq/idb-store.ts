import Dexie from "dexie";
import {
  deleteDish as deleteDishDocument,
  deleteOrder as deleteOrderDocument,
  exportBackup as exportBackupDocument,
  getOrder as getOrderDocument,
  listCategories as listCategoriesDocument,
  listDishes as listDishesDocument,
  listOrders as listOrdersDocument,
  mergeBackup,
  saveCategory as saveCategoryDocument,
  saveDish as saveDishDocument,
  saveOrder as saveOrderDocument,
} from "./document";
import { type BbqStore, BbqStoreError } from "./store";
import type { Category, Dish, Order } from "./types";

type StoredDish = Omit<Dish, "unit"> & { unit?: string };
type StoredOrder = Omit<Order, "lines"> & {
  lines: Array<Omit<Order["lines"][number], "unit"> & { unit?: string }>;
};

const db = new Dexie("bbq");

db.version(1).stores({
  categories: "id, sort, name",
  dishes: "id, categoryId, sort, name",
  orders: "id, businessDayKey, status, openedAt, seat",
});

const categoriesTable = db.table<Category, string>("categories");
const dishesTable = db.table<StoredDish, string>("dishes");
const ordersTable = db.table<StoredOrder, string>("orders");

function createId(): string {
  return crypto.randomUUID();
}

async function readDocument() {
  const [categories, storedDishes, storedOrders] = await Promise.all([
    categoriesTable.toArray(),
    dishesTable.toArray(),
    ordersTable.toArray(),
  ]);
  const dishes: Dish[] = storedDishes.map((dish) => ({
    ...dish,
    unit: dish.unit?.trim() || "份",
  }));
  const orders: Order[] = storedOrders.map((order) => ({
    ...order,
    lines: order.lines.map((line) => ({
      ...line,
      unit: line.unit?.trim() || "份",
    })),
  }));
  return { categories, dishes, orders };
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
    listCategories() {
      return guard(async () => listCategoriesDocument(await readDocument()));
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
      return guard(async () => listDishesDocument(await readDocument()));
    },
    saveDish(input) {
      return guard(async () => {
        const saved = saveDishDocument(await readDocument(), input, createId);
        await dishesTable.put(saved.dish);
        return saved.dish;
      });
    },
    deleteDish(id) {
      return guard(async () => {
        deleteDishDocument(await readDocument(), id);
        await dishesTable.delete(id);
      });
    },
    listOrders(businessDayKey) {
      return guard(async () =>
        listOrdersDocument(await readDocument(), businessDayKey),
      );
    },
    getOrder(id) {
      return guard(async () => getOrderDocument(await readDocument(), id));
    },
    saveOrder(input) {
      return guard(async () => {
        const saved = saveOrderDocument(await readDocument(), input, {
          now: new Date(),
          createId,
        });
        await ordersTable.put(saved.order);
        return saved.order;
      });
    },
    deleteOrder(id) {
      return guard(async () => {
        deleteOrderDocument(await readDocument(), id);
        await ordersTable.delete(id);
      });
    },
    exportBackup() {
      return guard(async () => exportBackupDocument(await readDocument()));
    },
    importBackup(backup) {
      return guard(async () => {
        const current = await readDocument();
        const next = mergeBackup(current, backup);
        const categoryIds = new Set(backup.categories.map((item) => item.id));
        const dishIds = new Set(backup.dishes.map((item) => item.id));
        const orderIds = new Set(backup.orders.map((item) => item.id));
        await db.transaction(
          "rw",
          categoriesTable,
          dishesTable,
          ordersTable,
          async () => {
            const categories = next.categories.filter((item) =>
              categoryIds.has(item.id),
            );
            const dishes = next.dishes.filter((item) => dishIds.has(item.id));
            const orders = next.orders.filter((item) => orderIds.has(item.id));
            if (categories.length > 0)
              await categoriesTable.bulkPut(categories);
            if (dishes.length > 0) await dishesTable.bulkPut(dishes);
            if (orders.length > 0) await ordersTable.bulkPut(orders);
          },
        );
      });
    },
  };
}

export const bbqStore: BbqStore = createIdbStore();
