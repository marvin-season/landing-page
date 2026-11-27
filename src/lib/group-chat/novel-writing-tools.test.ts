import assert from "node:assert/strict";
import { test } from "node:test";
import {
  allowedWritingSkillIds,
  createNovelWritingTools,
  skillPoolFromPrompt,
  writingToolScopeForTask,
} from "./novel-writing-tools";

test("allowedWritingSkillIds opens the scoped catalog when the pool is empty", () => {
  assert.deepEqual(allowedWritingSkillIds([], "chapter"), [
    "scene-driven",
    "dialogue-first",
    "chapter-hook",
    "prose-imagery",
  ]);
  assert.deepEqual(
    allowedWritingSkillIds(["dialogue-first", "missing"], "rewrite"),
    ["dialogue-first"],
  );
});

test("apply_writing_skill only mounts skills from the pool", async () => {
  const tools = createNovelWritingTools(["scene-driven"], "chapter");
  const execute = tools.apply_writing_skill.execute;
  assert.ok(execute);
  const mounted = await execute({ skillId: "scene-driven" }, {} as never);
  assert.ok(mounted && typeof mounted === "object" && "id" in mounted);
  assert.equal(mounted.id, "scene-driven");
  await assert.rejects(
    () => execute({ skillId: "dialogue-first" }, {} as never),
    /不在本次可选池/,
  );
});

test("skillPoolFromPrompt reads skillCatalog ids", () => {
  assert.deepEqual(
    skillPoolFromPrompt(
      JSON.stringify({
        skillCatalog: [{ id: "scene-driven" }, { id: "chapter-hook" }],
      }),
    ),
    ["scene-driven", "chapter-hook"],
  );
  assert.equal(writingToolScopeForTask("summary"), null);
  assert.equal(writingToolScopeForTask("chapter"), "chapter");
});
