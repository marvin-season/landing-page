import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./collapsible";

function renderPanel(open: boolean, forceMount?: true) {
  return renderToStaticMarkup(
    createElement(
      Collapsible,
      { open },
      createElement(CollapsibleTrigger, null, "Edit"),
      createElement(
        CollapsibleContent,
        { forceMount },
        createElement("input", { name: "draft", defaultValue: "unsaved" }),
      ),
    ),
  );
}

test("retained content keeps draft inputs in both open and closed markup", () => {
  for (const open of [false, true]) {
    const html = renderPanel(open, true);
    assert.match(html, /name="draft" value="unsaved"/);
    assert.match(html, new RegExp(`aria-expanded="${open}"`));
    assert.match(html, new RegExp(`data-state="${open ? "open" : "closed"}"`));
    assert.doesNotMatch(html, /forceMount=/);
  }
});

test("default content still unmounts when closed, preserving existing cart behavior", () => {
  assert.doesNotMatch(renderPanel(false), /name="draft"/);
  assert.match(renderPanel(true), /name="draft" value="unsaved"/);
});

test("nested collapsibles retain independent open states", () => {
  const html = renderToStaticMarkup(
    createElement(
      Collapsible,
      { open: false },
      createElement(CollapsibleTrigger, null, "Cart"),
      createElement(
        Collapsible,
        { open: true },
        createElement(CollapsibleTrigger, null, "Picker"),
        createElement(CollapsibleContent, null, "Available items"),
      ),
    ),
  );
  assert.match(html, /aria-expanded="false"[^>]*>Cart<\/button>/);
  assert.match(html, /aria-expanded="true"[^>]*>Picker<\/button>/);
  assert.match(html, /Available items/);
});
