import assert from "node:assert/strict";
import { test } from "node:test";
import { loadWorldTemplates } from "./world-templates";

test("scans json world templates", () => {
  const templates = loadWorldTemplates();
  assert.ok(templates.length >= 1);
  assert.equal(
    new Set(templates.map((template) => template.id)).size,
    templates.length,
  );
  for (const template of templates) {
    assert.ok(template.config.title);
    assert.ok(template.config.characters.length >= 2);
  }
});
