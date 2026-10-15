import { businessDayKey } from "./business-day";
import type { BbqBackup, Dish, Order } from "./types";

export function createSampleBackup(now: Date, existing: BbqBackup): BbqBackup {
  const categoryId = "loopy-sample-category";
  const dishes: Dish[] = [
    {
      id: "loopy-sample-coffee",
      name: "拿铁咖啡",
      priceCents: 1800,
      caloriesKcal: 120,
      unit: "杯",
    },
    {
      id: "loopy-sample-lunch",
      name: "日常午餐",
      priceCents: 2800,
      caloriesKcal: 650,
      unit: "份",
    },
    {
      id: "loopy-sample-walk",
      name: "散步半小时",
      priceCents: 0,
      caloriesKcal: -120,
      unit: "次",
    },
  ].map((dish, index) => ({ ...dish, categoryId, sort: index, listed: true }));
  const orders: Order[] = [];
  // 沿用上海记账时段；今天 1 条、昨天 2 条、前天 1 条，不生成未来时间。
  for (const [daysAgo, dishIndexes] of [
    [2, [1]],
    [1, [0, 2]],
    [0, [1]],
  ] as const) {
    const openedAt = new Date(now.getTime() - daysAgo * 86_400_000);
    const dayKey = businessDayKey(openedAt);
    const lastSeq = existing.orders.reduce(
      (max, order) =>
        order.businessDayKey === dayKey ? Math.max(max, order.seq) : max,
      0,
    );
    for (const [index, dishIndex] of dishIndexes.entries()) {
      const dish = dishes[dishIndex];
      const id = `loopy-sample-order:${dayKey}:${index + 1}`;
      orders.push({
        id,
        businessDayKey: dayKey,
        seq: lastSeq + index + 1,
        groupingEnabled: false,
        groupName: null,
        seat: null,
        status: "done",
        openedAt: openedAt.toISOString(),
        lines: [
          {
            id: `${id}:line`,
            dishId: dish.id,
            name: dish.name,
            priceCents: dish.priceCents,
            caloriesKcal: dish.caloriesKcal,
            unit: dish.unit,
            quantity: 1,
            lineCents: dish.priceCents,
          },
        ],
        photos: [],
        totalCents: dish.priceCents,
      });
    }
  }
  // 固定示例 ID，重复点击不叠加，也不覆盖用户对已导入示例的修改。
  return {
    version: 1,
    categories: existing.categories.some(
      (category) => category.id === categoryId,
    )
      ? []
      : [{ id: categoryId, name: "示例项目", sort: 0, listed: true }],
    dishes: dishes.filter(
      (dish) => !existing.dishes.some((item) => item.id === dish.id),
    ),
    orders: orders.filter(
      (order) => !existing.orders.some((item) => item.id === order.id),
    ),
  };
}
