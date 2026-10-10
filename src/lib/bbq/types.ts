export type OrderStatus = "open" | "done";

export type Category = {
  id: string;
  name: string;
  sort: number;
  listed: boolean;
};

export type Dish = {
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
  version: 1;
  categories: Category[];
  dishes: Dish[];
  orders: Order[];
};

export type BbqBackupExportOptions = {
  includePhotos?: boolean;
};

export type SaveOrderInput = {
  /** 新建时默认关闭；编辑时未传则保留原状态。 */
  groupingEnabled?: boolean;
  id?: string;
  seat: number | null;
  status: OrderStatus;
  openedAt?: string;
  lines: SaveOrderLineInput[];
  photos?: OrderPhoto[];
};
