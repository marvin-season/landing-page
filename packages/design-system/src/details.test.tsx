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
