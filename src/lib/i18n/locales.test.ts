import assert from "node:assert/strict";
import { test } from "node:test";
import { availableLocales, isBbqPath, withLocalePrefix } from "./locales";

test("only unprefixed BBQ routes need the Chinese redirect", () => {
  for (const path of ["/admin/bbq", "/admin/bbq/", "/admin/bbq/orders/123"]) {
    assert.equal(isBbqPath(path), true, path);
  }
  for (const path of [
    "/admin",
    "/admin/bbq-other",
    ...availableLocales.map((locale) => `/${locale}/admin/bbq/menu`),
  ]) {
    assert.equal(isBbqPath(path), false, path);
  }
});

test("BBQ links retain every selected locale, query and hash", () => {
  for (const locale of availableLocales) {
    for (const path of [
      "/admin/bbq",
      "/admin/bbq/menu",
      "/admin/bbq/orders/new",
      "/admin/bbq/orders/123",
      "/admin/bbq/settings",
      "/admin/bbq?day=2026-10-13%23off#details",
    ]) {
      const localized = `/${locale}${path}`;
      assert.equal(withLocalePrefix(path, locale), localized);
      assert.equal(withLocalePrefix(localized, locale), localized);
    }
  }
});

test("non-BBQ links keep existing locale behavior", () => {
  for (const path of [
    "/",
    "/knowledge?tab=chat",
    "/admin",
    "/admin/bbq-other",
  ]) {
    assert.equal(withLocalePrefix(path, "en"), path);
  }
  assert.equal(withLocalePrefix("/knowledge", "zh"), "/zh/knowledge");
  for (const path of [
    "/api/test",
    "/agent",
    "https://example.com",
    "//example.com",
  ]) {
    assert.equal(withLocalePrefix(path, "zh"), path);
  }
});
