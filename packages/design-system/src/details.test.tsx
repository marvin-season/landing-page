import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement, createRef, type ToggleEvent } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Details,
  DetailsChevron,
  DetailsContent,
  DetailsSummary,
} from "./details";
import { getDetailsPlacement } from "./details-placement";

test("auto placement chooses visible space and respects an explicit direction", () => {
  const bounds = { top: 100, bottom: 600 };
  assert.deepEqual(
    getDetailsPlacement({ top: 140, bottom: 190 }, bounds, "auto"),
    {
      side: "bottom",
      maxHeight: 402,
    },
  );
  assert.deepEqual(
    getDetailsPlacement({ top: 500, bottom: 550 }, bounds, "auto"),
    {
      side: "top",
      maxHeight: 392,
    },
  );
  assert.deepEqual(
    getDetailsPlacement({ top: 500, bottom: 550 }, bounds, "bottom"),
    {
      side: "bottom",
      maxHeight: 42,
    },
  );
});

test("placement does not exceed the boundary when the trigger scrolls outside it", () => {
  const bounds = { top: 100, bottom: 600 };
  assert.deepEqual(
    getDetailsPlacement({ top: 700, bottom: 750 }, bounds, "auto"),
    {
      side: "top",
      maxHeight: 492,
    },
  );
  assert.deepEqual(
    getDetailsPlacement({ top: 0, bottom: 50 }, bounds, "auto"),
    {
      side: "bottom",
      maxHeight: 492,
    },
  );
  assert.equal(
    getDetailsPlacement({ top: 100, bottom: 150 }, bounds, "top").maxHeight,
    0,
  );
});

test("auto placement preserves native markup without leaking boundary configuration", () => {
  const html = renderToStaticMarkup(
    createElement(
      Details,
      {
        mode: "floating",
        side: "auto",
        boundary: "[data-viewport]",
        name: "settings",
        open: true,
      },
      createElement(DetailsSummary, null, "Settings"),
      createElement(
        DetailsContent,
        null,
        createElement("input", { defaultValue: "draft" }),
      ),
    ),
  );
  assert.match(html, /^<details[^>]*><summary\b/);
  assert.match(html, /name="settings"/);
  assert.match(html, /value="draft"/);
  assert.match(html, /data-side="bottom"/);
  assert.doesNotMatch(html, /boundary=|data-side="auto"/);
});

test("forwards native open, name, ref and toggle events without managing state", () => {
  const ref = createRef<HTMLDetailsElement>();
  const events: ToggleEvent<HTMLDetailsElement>[] = [];
  const onToggle = (event: ToggleEvent<HTMLDetailsElement>) =>
    events.push(event);
  const element = Details({ open: true, name: "panels", ref, onToggle }).props
    .children;

  assert.equal(element.type, "details");
  assert.equal(element.props.open, true);
  assert.equal(element.props.name, "panels");
  assert.equal(element.props.ref, ref);
  assert.equal(element.props.onToggle, onToggle);

  const event = {
    currentTarget: { open: false },
  } as ToggleEvent<HTMLDetailsElement>;
  element.props.onToggle(event);
  assert.equal(events[0], event);
  assert.equal(Details({}).props.children.props.open, undefined);
});

test("keeps summary and content as direct children and retains closed form content", () => {
  const render = (open: boolean) => {
    const props = { open, "data-settings-section": "backup" };
    return renderToStaticMarkup(
      createElement(
        Details,
        props,
        createElement(
          DetailsSummary,
          { variant: "flush" },
          "Backup",
          createElement(DetailsChevron),
        ),
        createElement(
          DetailsContent,
          null,
          createElement("input", { name: "draft", defaultValue: "unsaved" }),
        ),
      ),
    );
  };
  const closed = render(false);
  const opened = render(true);

  for (const html of [closed, opened]) {
    assert.match(html, /^<details[^>]*><summary\b/);
    assert.match(html, /<\/summary><div[^>]*data-slot="details-content"/);
    assert.match(html, /data-settings-section="backup"/);
    assert.match(html, /name="draft" value="unsaved"/);
    assert.match(html, /group-open\/details:rotate-180/);
  }
  assert.doesNotMatch(closed, / open=""/);
  assert.match(opened, / open=""/);
});

test("allows callers to defer content and compose the summary appearance", () => {
  const hidden = renderToStaticMarkup(
    createElement(
      Details,
      null,
      createElement(DetailsSummary, null, "Load on demand"),
      createElement(DetailsContent, null, false && createElement("input")),
    ),
  );
  assert.doesNotMatch(hidden, /<input/);
  assert.match(DetailsSummary({}).props.className, /\bmin-h-11\b/);
  const flush = DetailsSummary({ variant: "flush" });
  assert.match(flush.props.className, /\bmin-h-14\b/);
  assert.equal(flush.props.variant, undefined);
  const custom = DetailsSummary({ className: "min-h-16" });
  assert.match(custom.props.className, /\bmin-h-16\b/);
  assert.doesNotMatch(custom.props.className, /\bmin-h-11\b/);
});

test("floating panels retain closed drafts, support both sides and optional backdrops", () => {
  for (const side of ["top", "bottom"] as const) {
    for (const open of [false, true]) {
      const html = renderToStaticMarkup(
        createElement(
          Details,
          { mode: "floating", side, open },
          createElement(DetailsSummary, null, "Edit"),
          createElement(
            DetailsContent,
            { className: "p-3", floatingClassName: "max-h-80" },
            createElement("input", { name: "draft", defaultValue: "unsaved" }),
          ),
        ),
      );
      assert.match(html, /^<details[^>]*><summary\b/);
      assert.match(html, new RegExp(`data-side="${side}"`));
      assert.match(html, /name="draft" value="unsaved"/);
      assert.match(html, /data-slot="details-backdrop"/);
      assert.match(html, /data-slot="details-panel"/);
      assert.doesNotMatch(html, /floatingClassName=|backdropClassName=/);
    }
  }
  const html = renderToStaticMarkup(
    createElement(Details, { mode: "floating", backdrop: "none" }),
  );
  assert.doesNotMatch(html, /data-slot="details-backdrop"/);
});

test("a nested flow disclosure does not inherit its floating parent's panel", () => {
  const html = renderToStaticMarkup(
    createElement(
      Details,
      { mode: "floating" },
      createElement(DetailsSummary, null, "Outer"),
      createElement(
        DetailsContent,
        null,
        createElement(
          Details,
          null,
          createElement(DetailsSummary, null, "Inner"),
          createElement(DetailsContent, null, "Nested content"),
        ),
      ),
    ),
  );
  assert.equal(html.match(/data-slot="details-panel"/g)?.length, 1);
});

test("floating dismissals close the native element and respect prevented Escape", () => {
  let focused = 0;
  let stopped = 0;
  const target = {
    open: true,
    querySelector: () => ({ focus: () => focused++ }),
  };
  const element = Details({ mode: "floating" }).props.children;
  const event = {
    key: "Escape",
    defaultPrevented: false,
    currentTarget: target,
    preventDefault(this: { defaultPrevented: boolean }) {
      this.defaultPrevented = true;
    },
    stopPropagation() {
      stopped++;
    },
  } as unknown as React.KeyboardEvent<HTMLDetailsElement>;
  element.props.onKeyDown?.(event);
  assert.equal(target.open, false);
  assert.equal(focused, 1);
  assert.equal(stopped, 1);

  target.open = true;
  const cancelled = Details({
    mode: "floating",
    onKeyDown: (event) => event.preventDefault(),
  }).props.children;
  cancelled.props.onKeyDown?.({ ...event, defaultPrevented: false });
  assert.equal(target.open, true);

  const backdrop = element.props.children[1];
  assert.ok(backdrop);
  backdrop.props.onClick({ currentTarget: { closest: () => target } });
  assert.equal(target.open, false);
  assert.equal(focused, 2);
});
