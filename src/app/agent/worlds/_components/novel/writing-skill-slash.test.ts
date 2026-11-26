import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyWritingSkillSlash,
  filterWritingSkills,
  readSlashSkillQuery,
  slashSkillEnd,
} from "./writing-skill-slash";

test("readSlashSkillQuery only matches / after start or whitespace", () => {
  assert.deepEqual(readSlashSkillQuery("/场", 2), { start: 0, query: "场" });
  assert.deepEqual(readSlashSkillQuery("下一章 /对", 6), {
    start: 4,
    query: "对",
  });
  assert.equal(readSlashSkillQuery("路径/对", 4), null);
  assert.equal(readSlashSkillQuery("下一章 ", 4), null);
});

test("filterWritingSkills matches name id and description", () => {
  assert.ok(
    filterWritingSkills("场景").some((skill) => skill.id === "scene-driven"),
  );
  assert.ok(
    filterWritingSkills("dialogue").some(
      (skill) => skill.id === "dialogue-first",
    ),
  );
  assert.equal(filterWritingSkills("没有这个技法").length, 0);
});

test("applyWritingSkillSlash removes the remembered /query even if cursor moved", () => {
  const source = "补一场雨 /场";
  const slash = readSlashSkillQuery(source, source.length);
  assert.ok(slash);
  assert.equal(slashSkillEnd(slash), source.length);
  const next = applyWritingSkillSlash(source, "scene-driven", [], slash);
  assert.equal(next.value, "补一场雨 ");
  assert.equal(next.cursor, "补一场雨 ".length);
  assert.deepEqual(next.skills, ["scene-driven"]);
  const blurred = applyWritingSkillSlash(source, "chapter-hook", [], slash);
  assert.equal(blurred.value.includes("/"), false);
  assert.equal(blurred.value, "补一场雨 ");
});
