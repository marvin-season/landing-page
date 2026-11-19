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
    assert.ok(template.description);
    assert.ok(template.details);
    assert.ok(template.config.characters.length >= 2);
    for (const character of template.config.characters)
      assert.ok(character.avatar);
  }
  const lover = templates.find((template) => template.id === "loverorhate");
  assert.equal(lover?.kind, "novel");
  assert.equal(lover?.config.title, "爱与恨");
  assert.match(lover?.details ?? "", /何雨桐/);
});
