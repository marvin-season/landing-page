import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Collapsible,
  CollapsibleBackdrop,
  CollapsibleChevron,
  CollapsibleContent,
  CollapsibleTitle,
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

test("animated variants retain closed drafts without callers supplying forceMount or wrappers", () => {
  for (const variant of ["collapse", "floating"] as const) {
    for (const open of [false, true]) {
      const html = renderToStaticMarkup(
        createElement(
          Collapsible,
          { open },
          createElement(
            CollapsibleContent,
            { variant },
            createElement("input", { name: "draft", defaultValue: "unsaved" }),
          ),
        ),
      );
      assert.match(html, /name="draft" value="unsaved"/);
      assert.doesNotMatch(html, /\s(?:variant|forceMount)=/);
      if (variant === "collapse") {
        assert.match(html, /data-slot="collapsible-body"/);
      } else {
        assert.doesNotMatch(html, /data-slot="collapsible-body"/);
      }
    }
  }
});

test("floating headings own their radius and surface without flush-style overrides", () => {
  const html = renderToStaticMarkup(
    createElement(
      Collapsible,
      { open: true },
      createElement(
        CollapsibleTrigger,
        { variant: "floating" },
        createElement(CollapsibleTitle, null, "Add item"),
        createElement(CollapsibleChevron),
      ),
    ),
  );
  const trigger = html.match(/<button[^>]*>/)?.[0];
  assert.ok(trigger);
  assert.match(trigger, /\brounded-xl\b/);
  assert.match(trigger, /\bbg-card\/85\b/);
  assert.doesNotMatch(
    trigger,
    /\brounded-none\b|\bbg-transparent\b|\svariant=/,
  );
  assert.match(html, /data-slot="collapsible-title"/);
  assert.match(html, /data-slot="collapsible-chevron"/);
});

test("plain triggers still compose existing cart and agent buttons without added styling", () => {
  const html = renderToStaticMarkup(
    createElement(
      Collapsible,
      null,
      createElement(
        CollapsibleTrigger,
        { asChild: true },
        createElement("button", { className: "cart-button" }, "Cart"),
      ),
    ),
  );
  assert.match(html, /class="cart-button"/);
  assert.equal(html.match(/<button\b/g)?.length, 1);
});

test("backdrops receive their open state from the same Radix root", () => {
  for (const open of [false, true]) {
    const html = renderToStaticMarkup(
      createElement(Collapsible, { open }, createElement(CollapsibleBackdrop)),
    );
    const backdrop = html.match(/<button[^>]*>/)?.[0];
    assert.ok(backdrop);
    assert.match(backdrop, /data-slot="collapsible-backdrop"/);
    assert.match(
      backdrop,
      new RegExp(`data-state="${open ? "open" : "closed"}"`),
    );
    assert.match(backdrop, /tabindex="-1"/);
  }
});
