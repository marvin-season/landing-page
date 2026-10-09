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
  unit: string;
  sort: number;
  listed: boolean;
};

export type OrderLine = {
  id: string;
  dishId: string | null;
  name: string;
  priceCents: number;
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
  unit: string;
  sort: number;
  listed: boolean;
};

export type SaveOrderLineInput = {
  id?: string;
  dishId: string | null;
  name: string;
  priceCents: number;
  unit: string;
  quantity: number;
};

export type BbqBackup = {
  version: 1;
  categories: Category[];
  dishes: Dish[];
  orders: Order[];
};

export type SaveOrderInput = {
  id?: string;
  seat: number | null;
  status: OrderStatus;
  openedAt?: string;
  lines: SaveOrderLineInput[];
  photos?: OrderPhoto[];
};
