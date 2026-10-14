import type { Dish, ItemTag, OrderLine } from "./types";

export const DEFAULT_TAG: ItemTag = { id: "default", name: "默认" };

export function getDishTagIds(dish: Pick<Dish, "tagIds" | "tagId">): string[] {
  return dish.tagIds ?? (dish.tagId ? [dish.tagId] : []);
}

export function getLineTags(line: Pick<OrderLine, "tags" | "tag">): ItemTag[] {
  return line.tags ?? (line.tag ? [line.tag] : []);
}

export function matchesTag(
  dish: Pick<Dish, "tagIds" | "tagId">,
  filter: string,
): boolean {
  if (filter === "all") return true;
  const ids = getDishTagIds(dish);
  if (filter === `tag:${DEFAULT_TAG.id}` && ids.length === 0) return true;
  return ids.some((id) => filter === `tag:${id}`);
}

export function resolveTagFilter(tags: ItemTag[], filter: string): string {
  return filter !== `tag:${DEFAULT_TAG.id}` &&
    filter.startsWith("tag:") &&
    !tags.some((tag) => `tag:${tag.id}` === filter)
    ? "all"
    : filter;
}
