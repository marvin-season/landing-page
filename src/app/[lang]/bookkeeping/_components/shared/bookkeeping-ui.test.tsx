import assert from "node:assert/strict";
import { test } from "node:test";
import { Card } from "@landing-page/design-system";
import { createElement, createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CalendarControl, CalendarDate } from "../home/calendar-controls";
import { DishField, DishForm, DishInput, MenuSurface } from "../menu/dish-form";
import {
  SettingsAction,
  SettingsRadioInput,
  SettingsRadioOption,
} from "../settings/settings-ui";
import { BookkeepingCard } from "./bookkeeping-layout";
import { BookkeepingTab } from "./bookkeeping-tab";

test("dish form keeps the native fieldset, field semantics and disabled state", () => {
  const html = renderToStaticMarkup(
    createElement(
      DishForm,
      { disabled: true },
      createElement(
        DishField,
        { asChild: true, className: "col-span-2" },
        createElement(
          "div",
          null,
          createElement(DishInput, { name: "draft", defaultValue: "unsaved" }),
        ),
      ),
    ),
  );
  assert.match(html, /^<fieldset\b[^>]*disabled=""/);
  assert.equal(html.match(/<fieldset\b/g)?.length, 1);
  assert.doesNotMatch(html, /<label\b/);
  assert.match(html, /name="draft"/);
  assert.match(html, /value="unsaved"/);
  assert.match(html, /col-span-2/);
});

test("surface and card slots add no DOM wrappers or conflicting radii", () => {
  const html = renderToStaticMarkup(
    createElement(
      MenuSurface,
      { asChild: true },
      createElement(
        BookkeepingCard,
        { asChild: true, variant: "padded" },
        createElement(Card, null, "Content"),
      ),
    ),
  );
  assert.equal(html.match(/<div\b/g)?.length, 1);
  assert.match(html, /data-slot="card"/);
  assert.match(html, /rounded-xl/);
  assert.match(html, /\bp-3\b/);
  assert.doesNotMatch(html, /rounded-none|\s(?:asChild|variant)=/);
});

test("radio choices preserve native values, checked state and disabled state", () => {
  const html = renderToStaticMarkup(
    createElement(
      SettingsRadioOption,
      null,
      createElement(SettingsRadioInput, {
        name: "photos",
        value: "include",
        defaultChecked: true,
        disabled: true,
      }),
      "Include photos",
    ),
  );
  assert.match(html, /^<label\b/);
  assert.match(html, /type="radio"/);
  assert.match(html, /name="photos"/);
  assert.match(html, /value="include"/);
  assert.match(html, /checked=""/);
  assert.match(html, /disabled=""/);
});

test("tabs preserve caller handlers and never submit an enclosing form", () => {
  const onClick = () => {};
  for (const variant of ["view", "status", "chart"] as const) {
    const button = BookkeepingTab({ selected: true, variant, onClick });
    assert.equal(button.props.type, "button");
    assert.equal(button.props["aria-pressed"], true);
    assert.equal(button.props.onClick, onClick);
    assert.equal(button.props.variant, undefined);
  }
});

test("calendar dates preserve the link and controls forward refs", () => {
  const html = renderToStaticMarkup(
    createElement(
      CalendarDate,
      { state: "selected", today: true },
      createElement("a", { href: "/bookkeeping?day=2026-10-21" }, "21"),
    ),
  );
  assert.match(html, /^<a\b/);
  assert.match(html, /href="\/bookkeeping\?day=2026-10-21"/);
  assert.doesNotMatch(html, /<button\b|\s(?:state|today)=/);
  const ref = createRef<HTMLButtonElement>();
  assert.equal(CalendarControl({ ref }).props.ref, ref);
  const inputRef = createRef<HTMLInputElement>();
  assert.equal(DishInput({ ref: inputRef }).props.ref, inputRef);
});

test("settings actions retain pending guards and callbacks", () => {
  const onClick = () => {};
  const action = SettingsAction({ tone: "danger", disabled: true, onClick });
  assert.equal(action.props.disabled, true);
  assert.equal(action.props.onClick, onClick);
  assert.equal(action.props.type, "button");
  assert.equal(action.props.tone, undefined);
  assert.match(action.props.className, /text-destructive/);
});
