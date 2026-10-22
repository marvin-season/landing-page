import assert from "node:assert/strict";
import { test } from "node:test";
import {
  bookkeepingPath,
  canNavigateBookkeepingLocally,
  readBookkeepingRoute,
} from "./routes";

test("navigation paths round-trip for all pages and preserve encoded parameters", () => {
  assert.equal(bookkeepingPath(), "/bookkeeping");
  for (const page of [
    "",
    "menu",
    "settings",
    "announcements",
    "tools",
    "orders/new",
  ]) {
    assert.deepEqual(readBookkeepingRoute(`/zh${bookkeepingPath(page)}`), {
      locale: "zh",
      page,
    });
  }
  assert.deepEqual(readBookkeepingRoute("/zh/bookkeeping/offline"), {
    locale: "zh",
    page: "",
  });

  const day = "2026-10-22#off";
  const home = new URL(bookkeepingPath("", { day }), "https://example.com");
  assert.equal(home.pathname, "/bookkeeping");
  assert.equal(home.searchParams.get("day"), day);
  assert.equal(home.hash, "");
  assert.equal(
    bookkeepingPath("settings", { section: "companion-album" }),
    "/bookkeeping/settings?section=companion-album",
  );

  const id = "record /?#一";
  const path = bookkeepingPath(`orders/${encodeURIComponent(id)}`);
  assert.deepEqual(readBookkeepingRoute(`/en${path}`), {
    locale: "en",
    page: "orders/[id]",
    orderId: id,
  });
});

test("local routes preserve record IDs, new-record semantics, and trailing slashes", () => {
  assert.deepEqual(readBookkeepingRoute("/zh/bookkeeping/orders/new"), {
    locale: "zh",
    page: "orders/new",
  });
  assert.deepEqual(
    readBookkeepingRoute("/en/bookkeeping/orders/record%20one"),
    {
      locale: "en",
      page: "orders/[id]",
      orderId: "record one",
    },
  );
  assert.deepEqual(readBookkeepingRoute("/en/bookkeeping/menu/"), {
    locale: "en",
    page: "menu",
  });
  assert.deepEqual(readBookkeepingRoute("/zh/bookkeeping/announcements"), {
    locale: "zh",
    page: "announcements",
  });
  assert.deepEqual(readBookkeepingRoute("/zh/bookkeeping/tools/"), {
    locale: "zh",
    page: "tools",
  });
  for (const path of [
    "/ja/bookkeeping/menu",
    "/pseudo/bookkeeping",
    "/zh/admin",
    "/zh/bookkeeping-other",
    "/zh/bookkeeping/orders/a/b",
    "/zh/bookkeeping/orders/%ZZ",
  ]) {
    assert.equal(readBookkeepingRoute(path), null, path);
  }
});

test("only same-origin, same-language bookkeeping navigation bypasses Next", () => {
  const from = new URL("https://example.com/zh/bookkeeping");
  for (const path of [
    "/zh/bookkeeping?day=2026-10-15",
    "/zh/bookkeeping/orders/new",
    "/zh/bookkeeping/orders/local-id",
    "/zh/bookkeeping/settings",
    "/zh/bookkeeping/announcements",
    "/zh/bookkeeping/tools",
  ]) {
    assert.equal(
      canNavigateBookkeepingLocally(from, new URL(path, from)),
      true,
    );
  }
  for (const path of [
    "https://other.example/zh/bookkeeping",
    "/en/bookkeeping",
    "/ja/bookkeeping/menu",
    "/pseudo/bookkeeping",
    "/zh/admin",
    "/zh/bookkeeping/unknown",
  ]) {
    assert.equal(
      canNavigateBookkeepingLocally(from, new URL(path, from)),
      false,
    );
  }
});
