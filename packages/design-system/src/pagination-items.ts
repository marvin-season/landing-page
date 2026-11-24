export type PaginationEntry =
  | { type: "page"; page: number }
  | { type: "ellipsis"; pages: number[] };

function range(start: number, end: number) {
  if (end < start) return [];
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function visibleCount(count: number, start: number, end: number) {
  const pages = new Set<number>([1, count]);
  for (let item = start; item <= end; item += 1) pages.add(item);
  return pages.size;
}

function toEntries(
  count: number,
  start: number,
  end: number,
): PaginationEntry[] {
  const items: PaginationEntry[] = [{ type: "page", page: 1 }];
  if (start > 2) items.push({ type: "ellipsis", pages: range(2, start - 1) });
  for (const item of range(Math.max(start, 2), Math.min(end, count - 1))) {
    items.push({ type: "page", page: item });
  }
  if (end < count - 1) {
    items.push({ type: "ellipsis", pages: range(end + 1, count - 1) });
  }
  if (count > 1) items.push({ type: "page", page: count });
  return items;
}

export function getPaginationItems(
  count: number,
  page: number,
  options?: { max?: number },
): PaginationEntry[] {
  const max = Math.max(options?.max ?? 5, 1);
  if (count <= 0) return [];
  const current = Math.min(Math.max(page, 1), count);
  if (count <= max) {
    return range(1, count).map((item) => ({ type: "page", page: item }));
  }

  let start = current > 1 ? current - 1 : current;
  let end = current < count ? current + 1 : current;
  while (visibleCount(count, start, end) < max) {
    const leftHidden = start - 2;
    const rightHidden = count - 1 - end;
    if (leftHidden <= 0 && rightHidden <= 0) break;
    if (rightHidden > leftHidden) end += 1;
    else start -= 1;
  }
  return toEntries(count, start, end);
}
