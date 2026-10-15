export type OrderStatus = "open" | "done";

export type GroupingSettings = {
  enabled: boolean;
  names: string[];
};

export type Category = {
  id: string;
  name: string;
  sort: number;
  listed: boolean;
};

export type ItemTag = {
  id: string;
  name: string;
};

export type Dish = {
  /** 历史项目未关联标签时保持为空。 */
  tagIds?: string[];
  /** 兼容早期单标签数据。 */
  tagId?: string | null;
  id: string;
  categoryId: string;
  name: string;
  priceCents: number;
  /** 每单位热量（kcal）；旧数据或未填写时为空。 */
  caloriesKcal?: number | null;
  unit: string;
  sort: number;
  listed: boolean;
};

export type OrderLine = {
  /** 记录保存时的标签快照，不随常用项目修改。 */
  tags?: ItemTag[];
  /** 兼容早期单标签快照。 */
  tag?: ItemTag | null;
  id: string;
  dishId: string | null;
  name: string;
  priceCents: number;
  /** 每单位热量（kcal）；旧数据或未填写时为空。 */
  caloriesKcal?: number | null;
  unit: string;
  quantity: number;
  lineCents: number;
};

export type OrderPhoto = {
  id: string;
  dataUrl: string;
  createdAt: string;
};

export type Order = {
  /** 记录自身的分组开关；未设置的旧记录按店铺订单处理。 */
  groupingEnabled?: boolean;
  /** 自定义分组名称快照；undefined 兼容旧座号，null 表示不分组。 */
  groupName?: string | null;
  id: string;
  businessDayKey: string;
  seq: number;
  seat: number | null;
  status: OrderStatus;
  openedAt: string;
  lines: OrderLine[];
  photos: OrderPhoto[];
  totalCents: number;
};

export type SaveCategoryInput = {
  id?: string;
  name: string;
  sort: number;
  listed: boolean;
};

export type SaveDishInput = {
  /** undefined 保留旧关联；空数组使用默认标签。 */
  tagIds?: string[];
  /** 兼容早期单标签数据。 */
  tagId?: string | null;
  id?: string;
  categoryId: string;
  name: string;
  priceCents: number;
  /** 每单位热量（kcal）；旧数据或未填写时为空。 */
  caloriesKcal?: number | null;
  unit: string;
  sort: number;
  listed: boolean;
};

export type SaveOrderLineInput = {
  id?: string;
  dishId: string | null;
  name: string;
  priceCents: number;
  /** 每单位热量（kcal）；旧数据或未填写时为空。 */
  caloriesKcal?: number | null;
  unit: string;
  quantity: number;
};

export type BbqBackup = {
  groupingSettings?: GroupingSettings;
  tags?: ItemTag[];
  version: 1;
  categories: Category[];
  dishes: Dish[];
  orders: Order[];
};

export type BbqBackupExportOptions = {
  includePhotos?: boolean;
};

export type BbqCleanupOptions = {
  startDate: string;
  endDate: string;
  photosOnly: boolean;
};

export type BbqCleanupResult = {
  orderCount: number;
  photoCount: number;
};

export type SaveOrderInput = {
  groupName?: string | null;
  /** 新建时默认关闭；编辑时未传则保留原状态。 */
  groupingEnabled?: boolean;
  id?: string;
  seat: number | null;
  status: OrderStatus;
  openedAt?: string;
  lines: SaveOrderLineInput[];
  photos?: OrderPhoto[];
};
