import type {
  BbqBackup,
  BbqBackupExportOptions,
  BbqCleanupOptions,
  BbqCleanupResult,
  Category,
  Dish,
  GroupingSettings,
  ItemTag,
  Order,
  SaveCategoryInput,
  SaveDishInput,
  SaveOrderInput,
} from "./types";

export type BbqStoreErrorCode =
  | "invalid_group_name"
  | "invalid_group_settings"
  | "group_exists"
  | "invalid_cleanup_range"
  | "tag_in_use"
  | "tag_not_found"
  | "tag_exists"
  | "storage_failed"
  | "invalid_backup"
  | "not_found"
  | "invalid_seat"
  | "invalid_money"
  | "invalid_calories"
  | "invalid_name"
  | "category_not_found"
  | "dish_unavailable";

export class BbqStoreError extends Error {
  readonly code: BbqStoreErrorCode;

  constructor(code: BbqStoreErrorCode) {
    super(code);
    this.name = "BbqStoreError";
    this.code = code;
  }
}

export interface BbqStore {
  getGroupingSettings(): Promise<GroupingSettings>;
  saveGroupingSettings(settings: GroupingSettings): Promise<GroupingSettings>;
  listTags(): Promise<ItemTag[]>;
  addTag(name: string): Promise<ItemTag>;
  deleteTag(id: string): Promise<void>;
  listCategories(): Promise<Category[]>;
  saveCategory(input: SaveCategoryInput): Promise<Category>;
  listDishes(): Promise<Dish[]>;
  saveDish(input: SaveDishInput): Promise<Dish>;
  deleteDish(id: string): Promise<void>;
  listOrders(businessDayKey: string): Promise<Order[]>;
  listAllOrders(): Promise<Order[]>;
  getOrder(id: string): Promise<Order | null>;
  saveOrder(input: SaveOrderInput): Promise<Order>;
  deleteOrder(id: string): Promise<void>;
  cleanupOrders(options: BbqCleanupOptions): Promise<BbqCleanupResult>;
  exportBackup(options?: BbqBackupExportOptions): Promise<BbqBackup>;
  importBackup(backup: BbqBackup): Promise<void>;
}
