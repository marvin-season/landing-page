import assert from "node:assert/strict";
import { test } from "node:test";
import {
  maxWritingSkillsCharacters,
  normalizeSkillIds,
  resolveWritingSkills,
  writingSkills,
  writingSkillsField,
} from "./writing-skills";

test("normalizeSkillIds keeps known ids and drops duplicates", () => {
  assert.deepEqual(normalizeSkillIds(undefined), []);
  assert.deepEqual(
    normalizeSkillIds([
      "missing",
      "chapter-hook",
      "scene-driven",
      "chapter-hook",
      "dialogue-first",
    ]),
    ["chapter-hook", "scene-driven", "dialogue-first"],
  );
});

test("resolveWritingSkills filters by scope and stays within the shared budget", () => {
  const ids = writingSkills.map(({ id }) => id);
  assert.deepEqual(
    resolveWritingSkills(ids, "chapter").map(({ id }) => id),
    ["scene-driven", "dialogue-first", "chapter-hook"],
  );
  assert.deepEqual(
    resolveWritingSkills(ids, "rewrite").map(({ id }) => id),
    ["scene-driven", "dialogue-first"],
  );
  assert.deepEqual(
    resolveWritingSkills(ids, "plot").map(({ id }) => id),
    ["scene-driven"],
  );
  assert.deepEqual(
    resolveWritingSkills(ids, ["chapter", "plot"]).map(({ id }) => id),
    ["scene-driven", "dialogue-first", "chapter-hook"],
  );
  assert.equal(writingSkillsField([], "chapter").skills, undefined);
  assert.equal(
    writingSkillsField(["scene-driven"], "plot").skills?.[0]?.id,
    "scene-driven",
  );
  const total = writingSkills.reduce(
    (sum, skill) => sum + skill.instructions.length,
    0,
  );
  assert.ok(total <= maxWritingSkillsCharacters);
});
