import assert from "node:assert/strict";
import { test } from "node:test";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PageFade } from "./page-fade";

function renderPage(pathname: string) {
  return renderToStaticMarkup(
    createElement(
      PathnameContext.Provider,
      { value: pathname },
      createElement(
        PageFade,
        null,
        createElement("nav", null, "首页 / 记账 / 菜单"),
      ),
    ),
  );
}

test("BBQ pages keep navigation outside opacity and transform transitions", () => {
  for (const path of [
    "/bookkeeping",
    "/bookkeeping/menu",
    "/bookkeeping/orders/new",
    "/bookkeeping/orders/123",
    "/zh/bookkeeping/menu",
    "/en/bookkeeping",
    "/en/bookkeeping/orders/new",
  ]) {
    assert.equal(renderPage(path), "<nav>首页 / 记账 / 菜单</nav>", path);
  }
});

test("other pages retain their existing entry animation", () => {
  for (const path of [
    "/",
    "/knowledge",
    "/zh/knowledge",
    "/admin",
    "/bookkeeping-other",
    "/unknown/bookkeeping",
  ]) {
    assert.match(renderPage(path), /opacity:0/, path);
  }
});
