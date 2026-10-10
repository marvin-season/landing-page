import { businessDayKey, formatShanghaiDate } from "./business-day";
import {
  assertPriceCents,
  assertQuantity,
  lineCents,
  totalCents,
} from "./money";
import { BbqStoreError } from "./store";
import type {
  AccountingMode,
  BbqBackup,
  BbqBackupExportOptions,
  Category,
  Dish,
  Order,
  OrderLine,
  OrderPhoto,
  OrderStatus,
  SaveCategoryInput,
  SaveDishInput,
  SaveOrderInput,
} from "./types";

export type BbqDocument = {
  categories: Category[];
  dishes: Dish[];
  orders: Order[];
};

export type DocumentClock = {
  mode?: AccountingMode;
  now: Date;
  createId: () => string;
};

export function emptyDocument(): BbqDocument {
  return { categories: [], dishes: [], orders: [] };
}

function requireName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) throw new BbqStoreError("invalid_name");
  return trimmed;
}

function requireSeat(seat: number | null): number | null {
  if (seat === null) return null;
  if (!Number.isInteger(seat) || seat < 1 || seat > 8) {
    throw new BbqStoreError("invalid_seat");
  }
  return seat;
}

function bySortThenName<T extends { sort: number; name: string }>(
  left: T,
  right: T,
): number {
  if (left.sort !== right.sort) return left.sort - right.sort;
  return left.name.localeCompare(right.name, "zh-CN");
}

function replaceById<T extends { id: string }>(items: T[], next: T): T[] {
  const index = items.findIndex((item) => item.id === next.id);
  if (index === -1) return [...items, next];
  return items.map((item, itemIndex) => (itemIndex === index ? next : item));
}

export function listCategories(document: BbqDocument): Category[] {
  return document.categories.toSorted(bySortThenName);
}

export function saveCategory(
  document: BbqDocument,
  input: SaveCategoryInput,
  createId: () => string,
): { document: BbqDocument; category: Category } {
  const category: Category = {
    id: input.id ?? createId(),
    name: requireName(input.name),
    sort: input.sort,
    listed: input.listed,
  };
  return {
    document: {
      ...document,
      categories: replaceById(document.categories, category),
    },
    category,
  };
}

export function listDishes(document: BbqDocument): Dish[] {
  return document.dishes.toSorted(bySortThenName);
}

export function deleteDish(document: BbqDocument, id: string): BbqDocument {
  if (!document.dishes.some((dish) => dish.id === id)) {
    throw new BbqStoreError("not_found");
  }
  return {
    ...document,
    dishes: document.dishes.filter((dish) => dish.id !== id),
  };
}

export function saveDish(
  document: BbqDocument,
  input: SaveDishInput,
  createId: () => string,
): { document: BbqDocument; dish: Dish } {
  if (
    !document.categories.some((category) => category.id === input.categoryId)
  ) {
    throw new BbqStoreError("category_not_found");
  }
  const dish: Dish = {
    id: input.id ?? createId(),
    categoryId: input.categoryId,
    name: requireName(input.name),
    priceCents: assertPriceCents(input.priceCents),
    unit: requireName(input.unit),
    sort: input.sort,
    listed: input.listed,
  };
  return {
    document: { ...document, dishes: replaceById(document.dishes, dish) },
    dish,
  };
}

export function listOrders(document: BbqDocument, dayKey: string): Order[] {
  return document.orders
    .filter((order) => order.businessDayKey === dayKey)
    .toSorted((left, right) => {
      if (left.status !== right.status) return left.status === "open" ? -1 : 1;
      if (left.openedAt !== right.openedAt) {
        return left.openedAt < right.openedAt ? 1 : -1;
      }
      return right.seq - left.seq;
    });
}

export function listAllOrders(document: BbqDocument): Order[] {
  return document.orders.toSorted((left, right) => {
    if (left.openedAt !== right.openedAt) {
      return left.openedAt < right.openedAt ? 1 : -1;
    }
    return right.seq - left.seq;
  });
}

export function getOrder(document: BbqDocument, id: string): Order | null {
  return document.orders.find((order) => order.id === id) ?? null;
}

function listedDish(document: BbqDocument, dishId: string): Dish {
  const dish = document.dishes.find((item) => item.id === dishId);
  if (!dish?.listed) {
    throw new BbqStoreError("dish_unavailable");
  }
  return dish;
}

export function saveOrder(
  document: BbqDocument,
  input: SaveOrderInput,
  clock: DocumentClock,
): { document: BbqDocument; order: Order } {
  const personal = clock.mode === "personal";
  const seat = personal ? null : requireSeat(input.seat);
  if (personal && input.lines.length === 0)
    throw new BbqStoreError("invalid_name");
  const existing = input.id ? getOrder(document, input.id) : null;
  const lines: OrderLine[] = input.lines.map((lineInput) => {
    // Personal entries have no menu source; editing updates their own values.
    // Shop lines below continue to use the original menu snapshots.
    if (personal) {
      if (
        lineInput.id &&
        !existing?.lines.some((line) => line.id === lineInput.id)
      ) {
        throw new BbqStoreError("not_found");
      }
      const priceCents = assertPriceCents(lineInput.priceCents);
      const quantity = assertQuantity(lineInput.quantity);
      if (
        !Number.isSafeInteger(quantity) ||
        !Number.isSafeInteger(priceCents * quantity)
      )
        throw new BbqStoreError("invalid_money");
      return {
        id: lineInput.id ?? clock.createId(),
        dishId: null,
        name: requireName(lineInput.name),
        priceCents,
        unit: requireName(lineInput.unit),
        quantity,
        lineCents: lineCents(priceCents, quantity),
      };
    }
    if (lineInput.id) {
      const previous = existing?.lines.find((line) => line.id === lineInput.id);
      if (!previous) throw new BbqStoreError("not_found");
      const quantity = assertQuantity(lineInput.quantity);
      return {
        ...previous,
        quantity,
        lineCents: lineCents(previous.priceCents, quantity),
      };
    }
    if (!lineInput.dishId) throw new BbqStoreError("dish_unavailable");
    const dish = listedDish(document, lineInput.dishId);
    const quantity = assertQuantity(lineInput.quantity);
    return {
      id: clock.createId(),
      dishId: dish.id,
      name: dish.name,
      priceCents: dish.priceCents,
      unit: dish.unit,
      quantity,
      lineCents: lineCents(dish.priceCents, quantity),
    };
  });
  const orderTotal = totalCents(lines);
  if (personal && !Number.isSafeInteger(orderTotal))
    throw new BbqStoreError("invalid_money");
  const photos = input.photos ?? existing?.photos ?? [];
  const inputOpenedAt =
    (personal ? input.openedAt : undefined) ??
    existing?.openedAt ??
    input.openedAt ??
    clock.now.toISOString();
  if (Number.isNaN(Date.parse(inputOpenedAt)))
    throw new BbqStoreError("invalid_date");
  const openedAt = personal
    ? new Date(inputOpenedAt).toISOString()
    : inputOpenedAt;
  const dayKey = personal
    ? formatShanghaiDate(new Date(openedAt))
    : businessDayKey(new Date(openedAt));
  const seq =
    existing?.businessDayKey === dayKey
      ? existing.seq
      : document.orders.reduce((max, order) => {
          return order.businessDayKey === dayKey
            ? Math.max(max, order.seq)
            : max;
        }, 0) + 1;

  if (existing) {
    const order: Order = {
      ...existing,
      ...(personal ? { openedAt, businessDayKey: dayKey, seq } : {}),
      seat,
      status: input.status,
      lines,
      photos,
      totalCents: orderTotal,
    };
    return {
      document: { ...document, orders: replaceById(document.orders, order) },
      order,
    };
  }

  const order: Order = {
    id: input.id ?? clock.createId(),
    businessDayKey: dayKey,
    seq,
    seat,
    status: input.status,
    openedAt,
    lines,
    photos,
    totalCents: orderTotal,
  };
  return {
    document: { ...document, orders: [...document.orders, order] },
    order,
  };
}

export function deleteOrder(document: BbqDocument, id: string): BbqDocument {
  if (!document.orders.some((order) => order.id === id)) {
    throw new BbqStoreError("not_found");
  }
  return {
    ...document,
    orders: document.orders.filter((order) => order.id !== id),
  };
}

export function exportBackup(
  document: BbqDocument,
  options: BbqBackupExportOptions = {},
  mode: AccountingMode = "shop",
): BbqBackup {
  const orders = listAllOrders(document);
  return {
    version: 1,
    ...(mode === "personal" ? { accountingMode: mode } : {}),
    categories: listCategories(document),
    dishes: listDishes(document),
    orders: options.includePhotos
      ? orders
      : orders.map((order) => ({ ...order, photos: [] })),
  };
}

function invalidBackup(): never {
  throw new BbqStoreError("invalid_backup");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireId(value: unknown, seen: Set<string>): string {
  if (typeof value !== "string" || value.length === 0 || seen.has(value)) {
    invalidBackup();
  }
  seen.add(value);
  return value;
}

function requireBackupName(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) invalidBackup();
  return value.trim();
}

function requireBoolean(value: unknown): boolean {
  if (typeof value !== "boolean") invalidBackup();
  return value;
}

function requireFinite(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) invalidBackup();
  return value;
}

function requireInteger(value: unknown, min: number, max?: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min) {
    invalidBackup();
  }
  if (max !== undefined && value > max) invalidBackup();
  return value;
}

function requireText(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) invalidBackup();
  return value;
}

function requireStatus(value: unknown): OrderStatus {
  if (value !== "open" && value !== "done") invalidBackup();
  return value;
}

function requireDishId(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || value.length === 0) invalidBackup();
  return value;
}

function parseCategory(value: unknown, seen: Set<string>): Category {
  if (!isRecord(value)) invalidBackup();
  return {
    id: requireId(value.id, seen),
    name: requireBackupName(value.name),
    sort: requireFinite(value.sort),
    listed: requireBoolean(value.listed),
  };
}

function parseDish(
  value: unknown,
  seen: Set<string>,
  categoryIds: Set<string>,
): Dish {
  if (!isRecord(value)) invalidBackup();
  const categoryId = requireText(value.categoryId);
  if (!categoryIds.has(categoryId)) invalidBackup();
  const priceCents = requireInteger(value.priceCents, 0);
  return {
    id: requireId(value.id, seen),
    categoryId,
    name: requireBackupName(value.name),
    priceCents,
    unit: requireBackupName(value.unit),
    sort: requireFinite(value.sort),
    listed: requireBoolean(value.listed),
  };
}

function parseLine(value: unknown, seen: Set<string>): OrderLine {
  if (!isRecord(value)) invalidBackup();
  const priceCents = requireInteger(value.priceCents, 0);
  const quantity = requireInteger(value.quantity, 1);
  const lineTotal = requireInteger(value.lineCents, 0);
  if (lineTotal !== priceCents * quantity) invalidBackup();
  return {
    id: requireId(value.id, seen),
    dishId: requireDishId(value.dishId),
    name: requireBackupName(value.name),
    priceCents,
    unit: requireBackupName(value.unit),
    quantity,
    lineCents: lineTotal,
  };
}

function parsePhotos(value: unknown): OrderPhoto[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) invalidBackup();
  const photoIds = new Set<string>();
  return value.map((photo) => {
    if (!isRecord(photo)) invalidBackup();
    const dataUrl = requireText(photo.dataUrl);
    if (!/^data:image\/(?:jpeg|png|webp);base64,/i.test(dataUrl)) {
      invalidBackup();
    }
    return {
      id: requireId(photo.id, photoIds),
      dataUrl,
      createdAt: requireOpenedAt(photo.createdAt),
    };
  });
}

function parseOrder(value: unknown, seen: Set<string>): Order {
  if (!isRecord(value)) invalidBackup();
  if (!Array.isArray(value.lines)) invalidBackup();
  const lineIds = new Set<string>();
  return {
    id: requireId(value.id, seen),
    businessDayKey: requireText(value.businessDayKey),
    seq: requireInteger(value.seq, 1),
    seat: requireSeatValue(value.seat),
    status: requireStatus(value.status),
    openedAt: requireOpenedAt(value.openedAt),
    lines: value.lines.map((line) => parseLine(line, lineIds)),
    photos: parsePhotos(value.photos),
    totalCents: requireInteger(value.totalCents, 0),
  };
}

function requireSeatValue(value: unknown): number | null {
  if (value === null) return null;
  return requireInteger(value, 1, 8);
}

function requireOpenedAt(value: unknown): string {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    invalidBackup();
  }
  return value;
}

function parseBackup(value: unknown, current: BbqDocument): BbqBackup {
  if (!isRecord(value) || value.version !== 1) invalidBackup();
  if (!Array.isArray(value.categories) || !Array.isArray(value.dishes)) {
    invalidBackup();
  }
  if (!Array.isArray(value.orders)) invalidBackup();
  const categoryIds = new Set<string>();
  const categories = value.categories.map((item) =>
    parseCategory(item, categoryIds),
  );
  for (const category of current.categories) categoryIds.add(category.id);
  const dishIds = new Set<string>();
  const dishes = value.dishes.map((item) =>
    parseDish(item, dishIds, categoryIds),
  );
  const orderIds = new Set<string>();
  const orders = value.orders.map((item) => parseOrder(item, orderIds));
  return { version: 1, categories, dishes, orders };
}

function recalculate(order: Order): Order {
  const lines = order.lines.map((line) => ({
    ...line,
    lineCents: lineCents(line.priceCents, line.quantity),
  }));
  return { ...order, lines, totalCents: totalCents(lines) };
}

function mergeOrders(current: Order[], incoming: Order[]): Order[] {
  const merged = new Map(current.map((order) => [order.id, order]));
  for (const order of incoming) {
    const local = merged.get(order.id);
    if (!local) {
      merged.set(order.id, recalculate(order));
      continue;
    }
    const incomingLines = new Map(order.lines.map((line) => [line.id, line]));
    const localIds = new Set(local.lines.map((line) => line.id));
    const lines = local.lines.map((line) => incomingLines.get(line.id) ?? line);
    for (const line of order.lines) {
      if (!localIds.has(line.id)) lines.push(line);
    }
    const photos = mergeById(local.photos, order.photos);
    merged.set(
      order.id,
      recalculate({
        ...local,
        seat: order.seat,
        status: order.status,
        openedAt: order.openedAt,
        businessDayKey: order.businessDayKey,
        seq: order.seq,
        lines,
        photos,
      }),
    );
  }
  return [...merged.values()];
}

export function mergeBackup(
  current: BbqDocument,
  incoming: unknown,
  mode: AccountingMode = "shop",
): BbqDocument {
  // Legacy backups belong to the shop; never merge one ledger into the other.
  if (!isRecord(incoming)) invalidBackup();
  if ((incoming.accountingMode ?? "shop") !== mode) {
    throw new BbqStoreError("backup_mode_mismatch");
  }
  const backup = parseBackup(incoming, current);
  if (
    mode === "personal" &&
    (backup.categories.length > 0 ||
      backup.dishes.length > 0 ||
      backup.orders.some(
        (order) =>
          order.seat !== null ||
          order.lines.length === 0 ||
          order.lines.some((line) => line.dishId !== null) ||
          order.businessDayKey !== formatShanghaiDate(new Date(order.openedAt)),
      ))
  )
    invalidBackup();
  return {
    categories: mergeById(current.categories, backup.categories),
    dishes: mergeById(current.dishes, backup.dishes),
    orders: mergeOrders(current.orders, backup.orders),
  };
}

function mergeById<T extends { id: string }>(current: T[], incoming: T[]): T[] {
  const merged = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) merged.set(item.id, item);
  return [...merged.values()];
}
