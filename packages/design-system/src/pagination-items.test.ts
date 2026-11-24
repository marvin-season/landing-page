import assert from "node:assert/strict";
import { test } from "node:test";
import { getPaginationItems, type PaginationEntry } from "./pagination-items";

function format(items: PaginationEntry[]) {
  return items
    .map((item) => (item.type === "page" ? String(item.page) : "…"))
    .join(" ");
}

function itemBefore(items: PaginationEntry[], page: number) {
  const index = items.findIndex(
    (item) => item.type === "page" && item.page === page,
  );
  return index > 0 ? items[index - 1] : undefined;
}

test("shows every page until there are more than five", () => {
  assert.equal(format(getPaginationItems(5, 3)), "1 2 3 4 5");
  assert.equal(format(getPaginationItems(1, 1)), "1");
  assert.equal(format(getPaginationItems(6, 1)), "1 2 3 4 … 6");
});

test("moves the ellipsis off the page that sits beside it", () => {
  assert.equal(format(getPaginationItems(20, 6)), "1 … 5 6 7 … 20");
  const next = getPaginationItems(20, 5);
  assert.equal(format(next), "1 … 4 5 6 … 20");
  assert.notEqual(itemBefore(next, 5)?.type, "ellipsis");
});

test("keeps at most five page numbers once ellipsis appears", () => {
  assert.equal(format(getPaginationItems(8, 8)), "1 … 5 6 7 8");
  const atEdge = getPaginationItems(8, 5);
  assert.equal(format(atEdge), "1 … 4 5 6 … 8");
  assert.notEqual(itemBefore(atEdge, 5)?.type, "ellipsis");
});

test("ellipsis lists only the hidden pages and never touches the current page", () => {
  for (let count = 1; count <= 24; count += 1) {
    for (let page = 1; page <= count; page += 1) {
      const items = getPaginationItems(count, page);
      const shown = new Set<number>();
      const hidden = new Set<number>();
      let pageButtons = 0;
      for (const item of items) {
        if (item.type === "page") {
          assert.equal(shown.has(item.page), false);
          shown.add(item.page);
          pageButtons += 1;
        } else {
          assert.ok(item.pages.length >= 1);
          for (const hiddenPage of item.pages) hidden.add(hiddenPage);
        }
      }
      assert.equal(shown.size + hidden.size, count);
      for (const hiddenPage of hidden)
        assert.equal(shown.has(hiddenPage), false);
      if (count > 5) assert.ok(pageButtons <= 5);
      const index = items.findIndex(
        (item) => item.type === "page" && item.page === page,
      );
      assert.notEqual(index, -1);
      if (page > 1) assert.notEqual(items[index - 1]?.type, "ellipsis");
      if (page < count) assert.notEqual(items[index + 1]?.type, "ellipsis");
    }
  }
});
