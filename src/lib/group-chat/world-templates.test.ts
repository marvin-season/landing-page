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
    assert.ok(template.kind === "script" || template.kind === "novel");
    assert.ok(template.source === "builtin" || template.source === "local");
    for (const character of template.config.characters)
      assert.ok(character.avatar);
  }
  const fog = templates.find((template) => template.id === "fog-harbor");
  assert.equal(fog?.kind, "script");
  assert.equal(fog?.source, "builtin");
  assert.equal(fog?.config.title, "雾港停电之夜");
  const local = templates.find((template) => template.source === "local");
  if (local) assert.equal(local.source, "local");
});
